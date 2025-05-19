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
router.get('/consumidor', (req, res) => res.render('consumidor'));

// Partials
router.get('/login', (req, res) => res.render('login'));
router.get('/cadastro', (req, res) => res.render('form_cadastro'));
router.get('/cadastro_usuario', (req, res) => res.render('cadastro_usuario'));

// Processamento - Usuário
router.post('/cadastro', usuarioController.cadastrarUsuario);
router.post('/login', usuarioController.loginUsuario);
router.post('/cadastro_oferta', usuarioController.cadastrarContrato);
router.post('/Simular-Contrato', usuarioController.processaSimulacao);
router.post('/rescindir_contrato', usuarioController.rescindirContrato);

// Páginas autenticadas
router.get('/home_consumidor', (req, res) => {
  if (req.session.usuario?.tipo === 'C') {
    return res.render('home_consumidor', { NomeConsumidor: req.session.usuario.nome });
  }
  res.redirect('/');
});

router.get('/home_fornecedor', (req, res) => {
  if (req.session.usuario?.tipo === 'F') {
    const preco_kwh = parseFloat(req.session.usuario.preco_kwh) || 0;
    const geracao_kwh = parseFloat(req.session.usuario.geracao_kwh) || 0;
    const valorMensalComTaxa = req.session.usuario.valorMensalComTaxa || '0.00';

    const kwh_total = geracao_kwh * 720;

    return res.render('home_fornecedor', {
      nomeFornecedor: req.session.usuario.nome,
      preco_kwh: preco_kwh.toFixed(2),
      geracao_kwh: geracao_kwh.toFixed(2),
      dataAssinatura: req.session.usuario.dataAssinatura,
      dataFinal: req.session.usuario.dataFinal,
      prazoContrato: req.session.usuario.prazoContrato,
      estado_fazenda: req.session.usuario.estado_fazenda,
      kwh_total: kwh_total.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      repasse: valorMensalComTaxa
    });
  }
  res.redirect('/');
});

// Array com os estados
const estados = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" }
];

// Rota GET para retornar os estados em JSON
// Para evitar conflito com a rota raiz "/", crie uma rota específica para os estados, ex: /api/estados
router.get('/api/estados', (req, res) => {
  res.json(estados);
});

module.exports = router;
