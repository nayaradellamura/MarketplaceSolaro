
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Páginas
router.get('/', (req, res) => res.render('index'));
router.get('/cadastro_usuario', (req, res) => res.render('cadastro_usuario'));
router.get('/login', (req, res) => res.render('login'));
router.get('/home', (req, res) => res.render('const_index'));

// Processamento de formulários
router.post('/cadastro', usuarioController.cadastrarUsuario);

module.exports = router;
