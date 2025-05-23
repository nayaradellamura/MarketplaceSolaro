const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const db = require('../db/db');

// Páginas públicas
router.get('/', (req, res) => res.render('index'));
router.get('/index', (req, res) => res.render('index'));
router.get('/duvidas', (req, res) => res.render('duvidas'));
router.get('/contato', (req, res) => res.render('contato'));
router.get('/sustentabilidade', (req, res) => res.render('sustentabilidade'));
router.get('/taxas', (req, res) => res.render('taxas'));
router.get('/home', (req, res) => res.render('home'));
router.get('/dash', (req, res) => res.render('dash'));




// Partials
router.get('/login', (req, res) => res.render('login'));
router.get('/cadastro', (req, res) => res.render('form_cadastro'));
router.get('/cadastro_usuario', (req, res) => res.render('cadastro_usuario'));
router.get('/termos', (req, res) => res.render('termos'));
router.get('/cookies', (req, res) => res.render('cookies'));


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
  if (req.session.usuario?.tipo !== 'F') {
    return res.redirect('/login');
  }

  const usuario_id = req.session.usuario.id;

  const contratoAtivoQuery = `
    SELECT * FROM contratos_fornecedores
    WHERE usuario_id = ? AND status = 'AT'
    ORDER BY data_assinatura DESC
    LIMIT 1
  `;

  const todosContratosQuery = `
    SELECT * FROM contratos_fornecedores
    WHERE usuario_id = ?
    ORDER BY data_assinatura DESC
  `;

  db.query(contratoAtivoQuery, [usuario_id], (err, ativoResults) => {
    if (err) {
      console.error('Erro ao buscar contrato ativo:', err);
      return res.status(500).send('Erro ao carregar página do fornecedor.');
    }

    db.query(todosContratosQuery, [usuario_id], (err2, todosContratos) => {
      if (err2) {
        console.error('Erro ao buscar todos os contratos:', err2);
        return res.status(500).send('Erro ao carregar todos os contratos.');
      }

      if (ativoResults.length === 0) {
        return res.render('home_fornecedor', {
          nomeFornecedor: req.session.usuario.nome,
          preco_kwh: '0.00',
          geracao_kwh: '0.00',
          data_assinatura: null,
          dataFinal: null,
          prazoContrato: null,
          estado_fazenda: null,
          kwh_total: '0,00',
          repasse: '0.00',
          contratos: todosContratos, 
        });
      }

      const contrato = ativoResults[0];
      const preco_kwh = parseFloat(contrato.preco_kwh);
      const geracao_kwh = parseFloat(contrato.geracao_kwh);
      const kwh_total = geracao_kwh * 720;

      res.render('home_fornecedor', {
        nomeFornecedor: req.session.usuario.nome,
        preco_kwh: preco_kwh.toFixed(2),
        geracao_kwh: geracao_kwh.toFixed(2),
        data_assinatura: contrato.data_assinatura,
        dataFinal: contrato.data_final,
        prazoContrato: contrato.prazo_contrato,
        estado_fazenda: contrato.estado_fazenda,
        kwh_total: kwh_total.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        repasse: contrato.valor_mensal_com_taxa || '0.00',
        flag: contrato.flag_fornecedor,
        contratos: todosContratos, 
      });
    });
  });
});














module.exports = router;




