const express = require("express");
const path = require("path");
const hbs = require("hbs");
const session = require("express-session");
const app = express();
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'O-Rato-Roeu-A-Roupa-Do-Rei-De-Roma-Habemus-Papam',
    resave: false,
    saveUninitialized: true, 
    cookie: {
        secure: false, 
        maxAge: 1000 * 60 * 60 * 2 
    }
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

app.use(express.static(path.join(__dirname, './public')));

app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, '/views/partials'));

const routes = require('./routes/routes');
app.use('/', routes);

app.listen(5050, () => {
    console.log("Servidor rodando na porta 5050");
});
