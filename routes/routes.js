const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const contratoController = require('../controllers/contratoController');

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
            rs_hora: req.session.usuario.rs_hora || 0,
            kwh_total: req.session.usuario.kwh_total || 0,
            repasse: req.session.usuario.repasse || 0
        });
    }
    res.redirect('/');
});

// Cadastro de contrato (fornecedor logado)
router.post('/cadastro-oferta', (req, res) => {
    if (!req.session.usuario || req.session.usuario.tipo !== 'F') {
        return res.status(403).send('Acesso não autorizado');
    }

    const dadosContrato = {
        ...req.body,
        UsuarioID: req.session.usuario.id // Fornecedor logado
    };

    contratoController.cadastrarContrato(dadosContrato, (erro) => {
        if (erro) {
            console.error('Erro ao cadastrar contrato:', erro);
            return res.status(500).send('Erro ao cadastrar contrato');
        }
        res.redirect('/home_fornecedor');
    });
});


module.exports = router;
