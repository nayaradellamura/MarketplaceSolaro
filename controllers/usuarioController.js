const db = require('../db/db');
const bcrypt = require('bcrypt');

// CADASTRAR USUÁRIO
exports.cadastrarUsuario = async (req, res) => {
    const {
        cpf_cnpj, nome, contato, tipo,
        cep, rua, numero, bairro, cidade, estado, pais,
        cadastroEmail, cadastroSenha
    } = req.body;

    try {
        const hashedSenha = await bcrypt.hash(cadastroSenha, 10);

        const insertUsuarioSQL = `
            INSERT INTO usuarios (
                cpf_cnpj, nome, contato, tipo,
                email, senha
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(insertUsuarioSQL, [
            cpf_cnpj, nome, contato, tipo,
            cadastroEmail, hashedSenha
        ], (err, result) => {
            if (err) {
                console.error("Erro ao cadastrar usuário:", err);
                return res.status(500).send('Erro ao cadastrar usuário.');
            }

            const usuario_id = result.insertId;

            const insertEnderecoSQL = `
                INSERT INTO enderecos (
                    usuario_id, cep, rua, numero, bairro, cidade, estado, pais
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(insertEnderecoSQL, [
                usuario_id, cep, rua, numero, bairro, cidade, estado, pais
            ], (err2) => {
                if (err2) {
                    console.error("Erro ao cadastrar endereço:", err2);
                    return res.status(500).send('Erro ao cadastrar endereço.');
                }

                res.redirect('/index?showLoginModal=true');
            });
        });

    } catch (error) {
        console.error("Erro ao processar cadastro:", error);
        res.status(500).send('Erro ao processar cadastro.');
    }
};

// LOGIN DE USUÁRIO
exports.loginUsuario = async (req, res) => {
    const { loginEmail, loginSenha } = req.body;

    try {
        const sql = 'SELECT * FROM usuarios WHERE email = ?';
        db.query(sql, [loginEmail], async (err, results) => {
            if (err) return res.status(500).send('Erro no servidor.');

            if (results.length === 0) {
                return res.redirect('/index?showLoginModal=true&loginError=true');
            }

            const usuario = results[0];
            const senhaCorreta = await bcrypt.compare(loginSenha, usuario.senha);

            if (!senhaCorreta) {
                return res.redirect('/index?showLoginModal=true&loginError=true');
            }

            // Inicializa sessão do usuário
            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipo: usuario.tipo
            };

            if (usuario.tipo === 'C') {
                return res.redirect('/home_consumidor');

            } else if (usuario.tipo === 'F') {
                const contratoSQL = `
                    SELECT 
                        c.id AS id,
                        c.usuario_id,
                        DATE_FORMAT(c.data_assinatura, '%d/%m/%Y') AS data_assinatura, 
                        DATE_FORMAT(c.data_final, '%d/%m/%Y') AS dataFinal, 
                        c.prazo_contrato,
                        c.estado_fazenda, 
                        c.preco_kwh, 
                        c.geracao_kwh,
                        t.taxa,
                        c.status,
                        c.flag_fornecedor
                    FROM 
                        contratos_fornecedores c
                    JOIN 
                        taxa_estaduais t ON c.estado_fazenda = t.estado
                    WHERE 
                        c.usuario_id = ? AND c.status = 'AT' AND c.flag_fornecedor = 1
                    ORDER BY 
                        c.id DESC
                    LIMIT 1;
                `;

                db.query(contratoSQL, [usuario.id], (errContrato, resultadosContrato) => {
                    if (errContrato) return res.status(500).send('Erro ao buscar contrato.');

                    if (resultadosContrato.length > 0) {
                        const contrato = resultadosContrato[0];

                        req.session.usuario = {
                            ...req.session.usuario,
                            id: contrato.id,
                            usuario_id: contrato.usuario_id,
                            data_assinatura: contrato.data_assinatura,
                            dataFinal: contrato.dataFinal,
                            prazoContrato: contrato.prazo_contrato,
                            estado_fazenda: contrato.estado_fazenda,
                            preco_kwh: contrato.preco_kwh,
                            geracao_kwh: contrato.geracao_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                            taxa: contrato.taxa,
                            flag_fornecedor: contrato.flag_fornecedor
                        };

                        console.log('Contrato carregado do fornecedor:', contrato);

                        const taxaEstadual = contrato.taxa / 100;
                        const precoComTaxa = contrato.preco_kwh * (1 + taxaEstadual);
                        const valorBase = precoComTaxa * contrato.geracao_kwh;

                        let taxaMensal = 0;
                        switch (contrato.prazo_contrato) {
                            case 3: taxaMensal = 0.075; break;
                            case 6: taxaMensal = 0.05; break;
                            case 12: taxaMensal = 0.025; break;
                            default: taxaMensal = 0;
                        }

                        const valorMensalComTaxa = valorBase * (1 + taxaMensal);
                        req.session.usuario.valorMensalComTaxa = valorMensalComTaxa.toFixed(2);
                    }

                    return res.redirect('/home_fornecedor');
                });
            } else {
                return res.redirect('/');
            }
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).send('Erro interno.');
    }
};

// CADASTRAR CONTRATO
exports.cadastrarContrato = (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).send('Usuário não está autenticado.');
    }

    const { preco_kwh, geracao_kwh, prazo_contrato, estado_fazenda } = req.body;
    const usuario_id = req.session.usuario.id;
    const meses = parseInt(prazo_contrato);

    if (!usuario_id) {
        return res.status(400).send('ID do usuário inválido na sessão.');
    }

    if (![3, 6, 12].includes(meses)) {
        return res.status(400).send('Prazo de contrato inválido');
    }

    const sqlContrato = `
        INSERT INTO contratos_fornecedores (
            usuario_id, data_assinatura, data_final, prazo_contrato,
            estado_fazenda, preco_kwh, geracao_kwh, flag_fornecedor
        )
        VALUES (?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, ?, ?, ?, 1)
    `;

    db.query(sqlContrato, [usuario_id, meses, meses, estado_fazenda, preco_kwh, geracao_kwh], (err2) => {
        if (err2) {
            console.error('Erro ao cadastrar contrato:', err2);
            return res.status(500).send('Erro ao cadastrar contrato.');
        }

        return res.redirect('/home_fornecedor');
    });
};


exports.renderHomeFornecedor = (req, res) => {
    res.render('home_fornecedor', { resultado_calculado: null });
};

exports.processaSimulacao = (req, res) => {
    const { preco_kwh_sim, geracao_kwh_sim, prazo_contrato_sim, estado_fazenda_sim } = req.body;

    const taxaSQL = `
        SELECT taxa FROM taxa_estaduais WHERE estado = ? LIMIT 1;
    `;

    db.query(taxaSQL, [estado_fazenda_sim], (err, resultadosTaxa) => {
        if (err) return res.status(500).send('Erro interno no servidor.');
        if (resultadosTaxa.length === 0) return res.status(400).send('Estado não encontrado.');

        const taxaEstadual = resultadosTaxa[0].taxa / 100;
        const precoComTaxa = preco_kwh_sim * (1 + taxaEstadual);
        const valorBase = precoComTaxa * geracao_kwh_sim;

        let taxaMensal = 0;
        switch (parseInt(prazo_contrato_sim)) {
            case 3: taxaMensal = 0.075; break;
            case 6: taxaMensal = 0.05; break;
            case 12: taxaMensal = 0.025; break;
        }

        const valorMensalComTaxa = valorBase * (1 + taxaMensal);
        const resultado_calculado = valorMensalComTaxa.toFixed(2);

        if (req.session.usuario) {
            req.session.usuario.resultado_calculado = resultado_calculado;
        }

        res.render('home_fornecedor', { resultado_calculado });
    });
};

exports.rescindirContrato = (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const usuario_id = req.session.usuario.id;
    const receitaEstimativa = 1; 
    const dataRescisao = new Date();

    const sqlUpdate = `
        UPDATE contratos_fornecedores
        SET 
            data_rescisao = ?, 
            status = 'RE',
            receita_prevista = ?
            flag_fornecedor = NULL
        WHERE usuario_id = ? AND status = 'AT'
    `;

    db.query(sqlUpdate, [dataRescisao, receitaEstimativa, usuario_id], (err, result) => {
        if (err) return res.status(500).send('Erro ao rescindir contrato.');
        if (result.affectedRows === 0) return res.status(404).send('Nenhum contrato ativo encontrado para rescindir.');
        flagRescisao = 1;
        res.redirect('/index');
    });
};
