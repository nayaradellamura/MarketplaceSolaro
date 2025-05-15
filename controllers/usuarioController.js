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

            // Cria a sessão
            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipo: usuario.tipo
            };

            // Redireciona conforme o tipo
            if (usuario.tipo === 'C') {
                return res.redirect('/home_consumidor');
            } else if (usuario.tipo === 'F') {
                return res.redirect('/home_fornecedor');
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
    if (!req.session.usuario || req.session.usuario.tipo !== 'F') {
        return res.status(403).send('Acesso negado');
    }

    const { preco_kwh, geracao_kwh } = req.body;
    const usuarioId = req.session.usuario.id;

    const sqlEndereco = 'SELECT estado FROM enderecos WHERE usuario_id = ? LIMIT 1';

    db.query(sqlEndereco, [usuarioId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Erro ao buscar estado:', err);
            return res.status(500).send('Erro ao buscar estado do usuário.');
        }

        const estado_fazenda = results[0].estado;

        const sqlContrato = `
            INSERT INTO contrato (
                UsuarioID, dataAssinatura, dataFinal, prazoContrato,
                estado_fazenda, preco_kwh, geracao_kwh
            )
            VALUES (?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), 
                    PERIOD_DIFF(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 3 MONTH), '%Y%m'), DATE_FORMAT(CURDATE(), '%Y%m')), 
                    ?, ?, ?)
        `;

        db.query(sqlContrato, [usuarioId, estado_fazenda, preco_kwh, geracao_kwh], (err2) => {
            if (err2) {
                console.error('Erro ao cadastrar contrato:', err2);
                return res.status(500).send('Erro ao cadastrar contrato.');
            }

            res.redirect('/home_fornecedor');
        });
    });
};
