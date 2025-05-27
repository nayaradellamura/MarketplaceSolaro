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
router.post('/cadastro_contrato_cliente', usuarioController.cadastrarContratoCliente);





router.get('/home_consumidor', (req, res) => {
  if (req.session.usuario?.tipo === 'C') {

    const usuario_id = req.session.usuario.id;

    const todosContratosConsumidorQuery = `
      SELECT * FROM contratos_clientes
      WHERE usuario_id = ? 
      ORDER BY data_inicio DESC
      LIMIT 1
    `;

    db.query(todosContratosConsumidorQuery, [usuario_id], (err, ativoClientesResults) => {
      if (err) {
        console.error('Erro ao buscar contrato ativo:', err);
        return res.status(500).send('Erro ao carregar página do consumidor.');
      }

      if (ativoClientesResults.length === 0) {
        // Sem contrato cadastrado, renderiza com valores zero
        return res.render('home_consumidor', {
          nomeFornecedor: req.session.usuario.nome,
          data_assinatura: '',
          consumo_medio: 0,
          valor_medio_contas: '0.00',
          valor_com_desconto: '0.00',
          economia_estimada: '0.00',
          flag: req.session.usuario.flag_cliente,
          contratosCliente: [],
        });
      }

      const contratoCliente = ativoClientesResults[0];

      const consumoMedioKwh = parseFloat(contratoCliente.consumo_media_fatura) || 0;
      const valorMedioContas = parseFloat(contratoCliente.media_valor_fatura) || 0;
      const precoFinalKwh = parseFloat(contratoCliente.preco_final_kwh) || 0;

      // Cálculo do preço médio atual por kWh (sem Solaro)
      const precoMedioAtualKwh = consumoMedioKwh > 0 ? valorMedioContas / consumoMedioKwh : 0;

      // Valor da fatura com desconto SOLARO
      const valorComDesconto = consumoMedioKwh * precoFinalKwh;

      // Economia estimada (valor atual - valor com desconto)
      const economiaEstimada = valorMedioContas - valorComDesconto;

      // Logs para debugging
      console.log('consumoMedioKwh:', consumoMedioKwh);
      console.log('valorMedioContas:', valorMedioContas);
      console.log('precoFinalKwh (Solaro):', precoFinalKwh);
      console.log('precoMedioAtualKwh (sem Solaro):', precoMedioAtualKwh.toFixed(4));
      console.log('valorComDesconto:', valorComDesconto.toFixed(2));
      console.log('economiaEstimada:', economiaEstimada.toFixed(2));

      res.render('home_consumidor', {
        nomeFornecedor: req.session.usuario.nome,
        consumo_medio: consumoMedioKwh.toFixed(2),
        valor_medio_contas: valorMedioContas.toFixed(2),
        valor_com_desconto: valorComDesconto.toFixed(2),
        economia_estimada: economiaEstimada.toFixed(2),
        flag: contratoCliente.flag_cliente,
        data_assinatura: formatarData(contratoCliente.data_inicio),
        estado_cliente: contratoCliente.estado_cliente,
        contratosCliente: ativoClientesResults,
        status: contratoCliente.status,
      });
    });
  } else {
    return res.redirect('/login');
  }
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

function formatarData(data) {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR'); 
}












module.exports = router;




