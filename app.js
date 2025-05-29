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

hbs.registerHelper('eq', (a, b) => a === b);

hbs.registerHelper('formatarData', function (data) {
  if (!data) return '';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR');
});

hbs.registerHelper('json', function (context) {
  return JSON.stringify(context);
});



app.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});
