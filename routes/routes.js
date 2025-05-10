
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Páginas
router.get('/', (req, res) => res.render('index'));
router.get('/index', (req, res) => res.render('index'));
router.get('/home', (req, res) => res.render('home'));
router.get('/home_consumidor', (req, res) => res.render('home_consumidor'));
router.get('/home_fornecedor', (req, res) => res.render('home_fornecedor'));

// Partials
router.get('/login', (req, res) => res.render('login'));
router.get('/cadastro', (req, res) => res.render('form_cadastro'));
router.get('/head', (req, res) => res.render('head'));
router.get('/footer', (req, res) => res.render('footer'));
router.get('/navbar_index', (req, res) => res.render('navbar_index'));
router.get('/navbar_home', (req, res) => res.render('navbar_home'));
router.get('/cadastro_usuario', (req, res) => res.render('cadastro_usuario'));

// Processamento de formulários
router.post('/cadastro', usuarioController.cadastrarUsuario);

module.exports = router;

