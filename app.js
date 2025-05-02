const express = require("express");
const path = require('path');
const mysql = require("mysql"); 
const dotenv = require('dotenv');
const e = require("express");

dotenv.config({ pat: './.env' })

const app = express();

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

app.listen(5000, () => {
    console.log("Servidor Rodanddo na Porta 5000");
})