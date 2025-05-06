
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Páginas
router.get('/', (req, res) => res.render('index'));
router.get('/index', (req, res) => res.render('index'));
router.get('/home', (req, res) => res.render('home'));
router.get('/login', (req, res) => res.render('login'));
router.get('/cadastro', (req, res) => res.render('form_cadastro'));
router.get('/cadastro_usuario', (req, res) => res.render('cadastro_usuario'));

// Processamento de formulários
router.post('/cadastro', usuarioController.cadastrarUsuario);

module.exports = router;

