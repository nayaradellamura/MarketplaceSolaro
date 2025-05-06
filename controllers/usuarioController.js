
const db = require('../db/db');

exports.cadastrarUsuario = (req, res) => {
    const {
        cpf_cnpj, nome, contato, tipo,
        cep, rua, numero, bairro, cidade, estado, pais,
        cadastroEmail, cadastroSenha
    } = req.body;

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
        cadastroEmail, cadastroSenha
    ], (err, result) => {
        if (err) {
            console.error("Erro ao cadastrar usuário:", err);
            return res.send('Erro ao cadastrar usuário.');
        }
        res.redirect('/home');
    });
};
