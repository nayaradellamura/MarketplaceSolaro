const express = require("express");
const path = require("path");
const mysql = require("mysql");
const dotenv = require("dotenv");
const hbs = require("hbs");

dotenv.config({ path: './.env' });

const app = express();

// Middleware para ler dados de formulário e JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Conexão com o banco de dados
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    database: process.env.DATABASE
});

db.connect((err) => {
    if (err) {
        console.error("Erro ao conectar no MySQL:", err);
    } else {
        console.log("MySQL conectado...");
    }
});

// Configurar caminhos
const publicDir = path.join(__dirname, './public');
app.use(express.static(publicDir));

app.set('view engine', 'hbs');

// Registrar diretório de partials
hbs.registerPartials(path.join(__dirname, '/views/partials'));

// Rotas principais
app.use('/', require('./routes/pages'));

// Rotas extras
app.get('/index', (req, res) => {
    res.render('index');
});

app.get('/home', (req, res) => {
    res.render('const_index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

// Rota para cadastro de usuários
app.post('/cadastro', (req, res) => {
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
        res.send('Usuário cadastrado com sucesso!');
    });
});

// Iniciar servidor
app.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});
