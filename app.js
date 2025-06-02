const express = require("express");
const path = require("path");
const hbs = require("hbs");
const session = require("express-session");
const nodemailer = require('nodemailer');
const app = express();
require('dotenv').config();

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_DESTINO_ADMIN = process.env.EMAIL_DESTINO_ADMIN;

let transporter;
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
        }
    });
}

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

app.post('/api/enviar-contato', async (req, res) => {
    if (!transporter) {
        return res.status(500).json({ message: 'Serviço de email não configurado no servidor.' });
    }
    if (!EMAIL_DESTINO_ADMIN) {
        return res.status(500).json({ message: 'Email de destino administrativo não configurado.' });
    }

    const { nome, email, mensagem } = req.body;

    if (!nome || !email || !mensagem) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    try {
        await transporter.sendMail({
            from: `"${nome} (Contato Site)" <${GMAIL_USER}>`,
            to: EMAIL_DESTINO_ADMIN,
            replyTo: email,
            subject: `Nova mensagem de Contato de: ${nome}`,
            html: `
                <p>Você recebeu uma nova mensagem através do formulário de contato do site:</p>
                <p><strong>Nome:</strong> ${nome}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Mensagem:</strong></p>
                <p>${mensagem.replace(/\n/g, '<br>')}</p>
            `
        });

        await transporter.sendMail({
            from: `"SOLARO" <${GMAIL_USER}>`,
            to: email,
            subject: 'Recebemos sua mensagem!',
            html: `
                <p>Olá ${nome},</p>
                <p>Obrigado por entrar em contato conosco!</p>
                <p>Recebemos sua mensagem e responderemos o mais breve possível.</p>
                <p>Atenciosamente,<br>Equipe SOLARO</p>
            `
        });
        res.status(200).json({ message: 'Mensagem enviada com sucesso! Verifique seu email para confirmação.' });

    } catch (error) {
        console.error('Erro ao enviar emails de contato:', error);
        res.status(500).json({ message: 'Falha ao enviar sua mensagem. Tente novamente mais tarde.' });
    }
});

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

hbs.registerHelper('formatarBR', function (valor) {
    if (typeof valor !== 'number' && valor != null) {
      valor = parseFloat(String(valor).replace(',', '.'));
    } else if (valor == null) {
      valor = 0;
    }
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
});

app.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});