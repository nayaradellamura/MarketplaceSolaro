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

        const sql = `
            INSERT INTO usuarios (
                cpf_cnpj, nome, contato, tipo,
                cep, rua, numero, bairro, cidade, estado, pais,
                email, senha
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [
            cpf_cnpj, nome, contato, tipo,
            cep, rua, numero, bairro, cidade, estado, pais,
            cadastroEmail, hashedSenha
        ], (err, result) => {
            if (err) {
                console.error("Erro ao cadastrar usuário:", err);
                return res.send('Erro ao cadastrar usuário.');
            }
            res.redirect('/index?showLoginModal=true');
        });

    } catch (error) {
        console.error("Erro ao encriptar a senha:", error);
        res.send('Erro ao processar cadastro.');
    }
};
