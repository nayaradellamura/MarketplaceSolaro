const db = require('../db/db');
const bcrypt = require('bcrypt');


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
                return res.send('Erro ao cadastrar usuário.');
            }

            const usuarioId = result.insertId;

            const insertEnderecoSQL = `
                INSERT INTO enderecos (
                    usuario_id, cep, rua, numero, bairro, cidade, estado, pais
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(insertEnderecoSQL, [
                usuarioId, cep, rua, numero, bairro, cidade, estado, pais
            ], (err2) => {
                if (err2) {
                    console.error("Erro ao cadastrar endereço:", err2);
                    return res.send('Erro ao cadastrar endereço.');
                }

                res.redirect('/index?showLoginModal=true');
            });
        });

    } catch (error) {
        console.error("Erro ao processar cadastro:", error);
        res.send('Erro ao processar cadastro.');
    }
};

exports.loginUsuario = async (req, res) => {
    const { loginEmail, loginSenha } = req.body;

    try {
        const sql = 'SELECT * FROM usuarios WHERE email = ?';
        db.query(sql, [loginEmail], async (err, results) => {
            if (err) {
                console.error("Erro na busca do usuário:", err);
                return res.status(500).send('Erro no servidor.');
            }

            if (results.length === 0) {
                return res.render('index', (err, html) => {
                    res.redirect('/index?showLoginModal=true&loginError=true');
                });
            }

            const usuario = results[0];
            const senhaCorreta = await bcrypt.compare(loginSenha, usuario.senha);

            if (!senhaCorreta) {
                return res.render('index', (err, html) => {
                    res.redirect('/index?showLoginModal=true&loginError=true');
                });
            }

            // Cria a sessão inicial
            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipo: usuario.tipo
            };

            console.log('Sessão do usuário:', req.session.usuario);

            if (usuario.tipo === 'C') {
                // Redireciona consumidores
                return res.redirect('/home_consumidor');

            } else if (usuario.tipo === 'F') {
                const contratoSQL = `
                    SELECT 
                        c.id, 
                        c.usuario_id, 
                        DATE_FORMAT(c.data_assinatura, '%d/%m/%Y') AS dataAssinatura, 
                        DATE_FORMAT(c.data_final, '%d/%m/%Y') AS dataFinal, 
                        c.prazo_contrato,
                        c.estado_fazenda, 
                        c.preco_kwh, 
                        c.geracao_kwh,
                        t.taxa
                    FROM 
                        contratos_fornecedores c
                    JOIN 
                        taxa_estaduais t ON c.estado_fazenda = t.estado
                    WHERE 
                        c.usuario_id = ?
                    ORDER BY 
                        c.id DESC
                    LIMIT 1;
                `;

                db.query(contratoSQL, [usuario.id], (errContrato, resultadosContrato) => {
                    if (errContrato) {
                        console.error("Erro ao buscar contrato:", errContrato);
                        return res.status(500).send('Erro ao buscar contrato.');
                    }

                    if (resultadosContrato.length > 0) {
                        const contrato = resultadosContrato[0];

                        req.session.usuario.IdOferta = contrato.IdOferta;
                        req.session.usuario.UsuarioID = contrato.UsuarioID;
                        req.session.usuario.dataAssinatura = contrato.dataAssinatura;
                        req.session.usuario.dataFinal = contrato.dataFinal;
                        req.session.usuario.prazoContrato = contrato.prazoContrato;
                        req.session.usuario.estado_fazenda = contrato.estado_fazenda;
                        req.session.usuario.preco_kwh = contrato.preco_kwh;
                        req.session.usuario.geracao_kwh = contrato.geracao_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        req.session.usuario.taxa = contrato.taxa;

                        // --- Cálculo do valor base mensal corrigido ---
                        const taxaEstadual = contrato.taxa / 100;
                        const precoComTaxa = contrato.preco_kwh * (1 + taxaEstadual);
                        const valorBase = precoComTaxa * contrato.geracao_kwh;

                        // --- Taxa mensal do Contrato Solaro ---
                        let taxaMensal = 0;
                        switch (contrato.prazoContrato) {
                            case 3:
                                taxaMensal = 0.075;
                                break;
                            case 6:
                                taxaMensal = 0.05;
                                break;
                            case 12:
                                taxaMensal = 0.025;
                                break;
                            default:
                                taxaMensal = 0;
                        }

                        // Valor mensal com taxa aplicada
                        const valorMensalComTaxa = valorBase * (1 + taxaMensal);
                        req.session.usuario.valorMensalComTaxa = valorMensalComTaxa.toFixed(2);


                    } else {
                        // Caso não tenha contrato cadastrado
                        req.session.usuario.IdOferta = null;
                        req.session.usuario.UsuarioID = usuario.id;
                        req.session.usuario.dataAssinatura = null;
                        req.session.usuario.dataFinal = null;
                        req.session.usuario.prazoContrato = null;
                        req.session.usuario.estado_fazenda = null;
                        req.session.usuario.preco_kwh = 0;
                        req.session.usuario.geracao_kwh = 0;
                        req.session.usuario.valorMensalComTaxa = '0.00';
                        req.session.usuario.taxaHora = 0;


                    }

                    // Após carregar dados do fornecedor, redireciona
                    return res.redirect('/home_fornecedor');
                });

            } else {
                // Tipo de usuário desconhecido ou não esperado
                return res.redirect('/');
            }
        });
    } catch (error) {
        console.error("Erro no login:", error);

        res.status(500).send('Erro interno.');
    }
};

exports.cadastrarContrato = (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).send('Usuário não está autenticado.');
    }

    const { preco_kwh, geracao_kwh, prazo_contrato, estado_fazenda } = req.body;
    const usuarioId = req.session.usuario.id;
    let meses = parseInt(prazo_contrato);

    if (![3, 6, 12].includes(meses)) {
        return res.status(400).send('Prazo de contrato inválido');
    }

    const sqlContrato = `
        INSERT INTO contratos_fornecedores (
            usuario_id, data_assinatura, data_final, prazo_contrato,
            estado_fazenda, preco_kwh, geracao_kwh
        )
        VALUES (?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, ?, ?, ?)
    `;

    db.query(sqlContrato, [usuarioId, meses, meses, estado_fazenda, preco_kwh, geracao_kwh], (err2) => {
        if (err2) {
            console.error('Erro ao cadastrar contrato:', err2);
            return res.status(500).send('Erro ao cadastrar contrato.');
        }

        const contratoSQL = `
            SELECT 
                c.id, 
                c.usuario_id, 
                DATE_FORMAT(c.data_assinatura, '%d/%m/%Y') AS dataAssinatura, 
                DATE_FORMAT(c.data_final, '%d/%m/%Y') AS dataFinal, 
                c.prazo_contrato,
                c.estado_fazenda, 
                c.preco_kwh, 
                c.geracao_kwh,
                c.status,
                t.taxa
            FROM 
                contratos_fornecedores c
            JOIN 
                taxa_estaduais t ON c.estado_fazenda = t.estado
            WHERE 
                c.usuarioID = ?
            ORDER BY 
                c.id DESC
            LIMIT 1;
        `;

        db.query(contratoSQL, [usuarioId], (errContrato, resultadosContrato) => {
            if (errContrato) {
                console.error("Erro ao buscar contrato:", errContrato);
                return res.status(500).send('Erro ao buscar contrato.');
            }

            if (resultadosContrato.length > 0) {
                const contrato = resultadosContrato[0];

                req.session.usuario.IdOferta = contrato.IdOferta;
                req.session.usuario.UsuarioID = contrato.UsuarioID;
                req.session.usuario.dataAssinatura = contrato.dataAssinatura;
                req.session.usuario.dataFinal = contrato.dataFinal;
                req.session.usuario.prazoContrato = contrato.prazoContrato;
                req.session.usuario.estado_fazenda = contrato.estado_fazenda;
                req.session.usuario.preco_kwh = contrato.preco_kwh;
                req.session.usuario.geracao_kwh = contrato.geracao_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                req.session.usuario.taxa = contrato.taxa;
                req.session.usuario.status = contrato.status;

                // Calcular valor mensal
                const taxaEstadual = contrato.taxa / 100;
                const precoComTaxa = contrato.preco_kwh * (1 + taxaEstadual);
                const valorBase = precoComTaxa * contrato.geracao_kwh;

                let taxaMensal = 0;
                switch (contrato.prazoContrato) {
                    case 3: taxaMensal = 0.075; break;
                    case 6: taxaMensal = 0.05; break;
                    case 12: taxaMensal = 0.025; break;
                    default: taxaMensal = 0;
                }

                const valorMensalComTaxa = valorBase * (1 + taxaMensal);
                req.session.usuario.valorMensalComTaxa = valorMensalComTaxa.toFixed(2);
            }

            // Agora redireciona com sessão atualizada
            return res.redirect('/home_fornecedor');
        });
    });
};

exports.renderHomeFornecedor = (req, res) => {
    res.render('home_fornecedor', { resultado_calculado: null });
};

exports.processaSimulacao = (req, res) => {
    const { preco_kwh_sim, geracao_kwh_sim, prazo_contrato_sim, estado_fazenda_sim } = req.body;

    const taxaSQL = `
    SELECT taxa
    FROM taxa_estaduais
    WHERE estado = ?
    LIMIT 1;
  `;

    db.query(taxaSQL, [estado_fazenda_sim], (err, resultadosTaxa) => {
        if (err) {
            console.error("Erro ao buscar taxa estadual:", err);
            return res.status(500).send('Erro interno no servidor.');
        }

        if (resultadosTaxa.length === 0) {
            return res.status(400).send('Estado não encontrado.');
        }

        const taxaEstadual = resultadosTaxa[0].taxa / 100;
        const precoComTaxa = preco_kwh_sim * (1 + taxaEstadual);
        const valorBase = precoComTaxa * geracao_kwh_sim;

        let taxaMensal = 0;
        switch (parseInt(prazo_contrato_sim)) {
            case 3:
                taxaMensal = 0.075;
                break;
            case 6:
                taxaMensal = 0.05;
                break;
            case 12:
                taxaMensal = 0.025;
                break;
            default:
                taxaMensal = 0;
        }

        const valorMensalComTaxa = valorBase * (1 + taxaMensal);
        const resultado_calculado = valorMensalComTaxa.toFixed(2);

        if (req.session.usuario) {
            req.session.usuario.resultado_calculado = resultado_calculado;
            console.log('Resultado do Simulador: ', resultado_calculado);
        }

        res.render('home_fornecedor', { resultado_calculado });
    });
};

exports.rescindirContrato = (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const usuarioId = req.session.usuario.id;

    const receitaEstimativa = 1 // Vou chamar uma função aqui
    const dataRescisao = new Date();

    const sqlUpdate = `
        UPDATE contratos_fornecedores
        SET 
            data_rescisao = ?, 
            status = 'RE',
            receita_prevista = ?
        WHERE usuario_id = ? AND status = 'AT'
    `;

    db.query(sqlUpdate, [dataRescisao, receitaEstimativa, usuarioId], (err, result) => {
        if (err) {
            console.error('Erro ao rescindir contrato:', err);
            return res.status(500).send('Erro ao rescindir contrato.');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Nenhum contrato ativo encontrado para rescindir.');
        }

        res.redirect('/index');
    });
};


