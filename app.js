const express = require("express");
const path = require("path");
const hbs = require("hbs");
const app = express();
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Arquivos públicos
app.use(express.static(path.join(__dirname, './public')));

// Views e partials
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, '/views/partials'));

// Rotas
const routes = require('./routes/routes');
app.use('/', routes);

// Servidor
app.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});
