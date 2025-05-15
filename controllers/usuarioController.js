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
                return res.render('login', { erro: 'Email ou senha inválidos!' });
            }

            const usuario = results[0];
            const senhaCorreta = await bcrypt.compare(loginSenha, usuario.senha);

            if (!senhaCorreta) {
                return res.render('login', { erro: 'Email ou senha inválidos!' });
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
                    SELECT IdOferta, UsuarioID, dataAssinatura, dataFinal, prazoContrato,
                           estado_fazenda, preco_kwh, geracao_kwh
                    FROM contrato
                    WHERE UsuarioID = ?
                    ORDER BY IdOferta DESC
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
                        req.session.usuario.geracao_kwh = contrato.geracao_kwh;
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
        INSERT INTO contrato (
            UsuarioID, dataAssinatura, dataFinal, prazoContrato,
            estado_fazenda, preco_kwh, geracao_kwh
        )
        VALUES (?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, ?, ?, ?)
    `;

    db.query(sqlContrato, [usuarioId, meses, meses, estado_fazenda, preco_kwh, geracao_kwh], (err2) => {
        if (err2) {
            console.error('Erro ao cadastrar contrato:', err2);
            return res.status(500).send('Erro ao cadastrar contrato.');
        }

        res.redirect('/home_fornecedor');
    });
};
