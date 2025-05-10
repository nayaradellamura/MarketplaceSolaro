
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Páginas
router.get('/', (req, res) => res.render('index'));
router.get('/index', (req, res) => res.render('index'));
router.get('/duvidas', (req, res) => res.render('duvidas'));
router.get('/contato', (req, res) => res.render('contato'));
router.get('/sustentabilidade', (req, res) => res.render('sustentabilidade'));
router.get('/home', (req, res) => res.render('home'));
router.get('/home_consumidor', (req, res) => res.render('home_consumidor'));
router.get('/home_fornecedor', (req, res) => res.render('home_fornecedor'));

// Partials
router.get('/tawkto', (req, res) => res.render('tawkto'));
router.get('/login', (req, res) => res.render('login'));
router.get('/cadastro', (req, res) => res.render('form_cadastro'));
router.get('/head', (req, res) => res.render('head'));
router.get('/footer', (req, res) => res.render('footer'));
router.get('/navbar_index', (req, res) => res.render('navbar_index'));
router.get('/navbar_home', (req, res) => res.render('navbar_home'));
router.get('/cadastro_usuario', (req, res) => res.render('cadastro_usuario'));

// Processamento de formulários
router.post('/cadastro', usuarioController.cadastrarUsuario);
router.post('/login', usuarioController.loginUsuario);

router.get('/home_consumidor', (req, res) => {
    if (req.session.usuario?.tipo === 'Consumidor') {
        return res.render('home_consumidor', { NomeConsumidor: req.session.usuario });
    }
    res.redirect('/');
});

router.get('/home_fornecedor', (req, res) => {
    if (req.session.usuario?.tipo === 'Fornecedor de Energi') {
        return res.render('home_fornecedor', { NomeFornecedor: req.session.usuario });
    }
    res.redirect('/');
});

module.exports = router;

