const express = require("express");
const path = require('path');
const mysql = require("mysql"); 
const dotenv = require('dotenv');
const e = require("express");

dotenv.config({ pat: './.env' })

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    database: process.env.DATABASE
});

const DiretorioPublico = path.join(__dirname, './public');
app.use(express.static(DiretorioPublico))

app.set('view engine', 'hbs');
   
db.connect( (error) => {
    if(error){
        console.log(erro)
    } else{
        console.log("MySQL Conectado...")
    }
})

// Definir Rotas
app.use('/', require('./routes/pages'));

app.get('/index', (req, res) => {
    res.render('index'); 
  });
  
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
        console.error(err);
        return res.send('Erro ao cadastrar usuário.');
      }
      res.send('Usuário cadastrado com sucesso!');
    });
  });

app.listen(5000, () => {
    console.log("Servidor Rodanddo na Porta 5000");
})