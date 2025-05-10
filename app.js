const express = require("express");
const path = require("path");
const hbs = require("hbs");
const session = require("express-session"); // <-- Adiciona essa linha
const app = express();
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração de sessão
app.use(session({
    secret: 'O-Rato-Roeu-A-Roupa-Do-Rei-De-Roma-Habemus-Papam', // Troque por algo mais seguro em produção
    resave: false,
    saveUninitialized: true
}));

// Middleware para tornar a sessão disponível nas views
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

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
