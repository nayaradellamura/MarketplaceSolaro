const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Páginas públicas
router.get('/', (req, res) => res.render('index'));
router.get('/index', (req, res) => res.render('index'));
router.get('/duvidas', (req, res) => res.render('duvidas'));
router.get('/contato', (req, res) => res.render('contato'));
router.get('/sustentabilidade', (req, res) => res.render('sustentabilidade'));
router.get('/taxas', (req, res) => res.render('taxas'));
router.get('/home', (req, res) => res.render('home'));

// Partials
router.get('/login', (req, res) => res.render('login'));
router.get('/cadastro', (req, res) => res.render('form_cadastro'));
router.get('/cadastro_usuario', (req, res) => res.render('cadastro_usuario'));

// Processamento - Usuário
router.post('/cadastro', usuarioController.cadastrarUsuario);
router.post('/login', usuarioController.loginUsuario);
router.post('/cadastro_oferta', usuarioController.cadastrarContrato);


// Páginas autenticadas
router.get('/home_consumidor', (req, res) => {
    if (req.session.usuario?.tipo === 'C') {
        return res.render('home_consumidor', { NomeConsumidor: req.session.usuario.nome });
    }
    res.redirect('/');
});

router.get('/home_fornecedor', (req, res) => {
    if (req.session.usuario?.tipo === 'F') {
        return res.render('home_fornecedor', {
            nomeFornecedor: req.session.usuario.nome,
            preco_kwh: req.session.usuario.preco_kwh  || 0,
            geracao_kwh : req.session.usuario.geracao_kwh  || 0,
            dataAssinatura: req.session.usuario.dataAssinatura,
            dataFinal: req.session.usuario.dataFinal,
            prazoContrato: req.session.usuario.prazoContrato,
            estado_fazenda: req.session.usuario.estado_fazenda
        });
    }
    res.redirect('/');
});




module.exports = router;
