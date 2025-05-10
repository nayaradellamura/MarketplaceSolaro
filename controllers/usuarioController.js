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
            if (usuario.tipo === 'Consumidor') {
                return res.redirect('/home_consumidor');
            } else if (usuario.tipo === 'Fornecedor de Energi') {
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