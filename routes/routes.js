const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const db = require('../db/db');
const moment = require('moment');


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
router.post('/salvar_kwh', usuarioController.salvarKwh);





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
        return res.render('home_consumidor', {
          nomeFornecedor: req.session.usuario.nome,
          data_assinatura: '',
          consumo_medio: 0,
          valor_medio_contas: '0.00',
          valor_com_desconto: '0.00',
          economia_estimada: '0.00',
          flag: req.session.usuario.flag_cliente,
          contratosCliente: [],
          faturas: []
        });
      }

      const contratoCliente = ativoClientesResults[0];
      const contratoId = contratoCliente.id;

      const vlr1 = parseFloat(contratoCliente.valor_fatura_1) || 0;
      const vlr2 = parseFloat(contratoCliente.valor_fatura_2) || 0;
      const vlr3 = parseFloat(contratoCliente.valor_fatura_3) || 0;

      const consumo1 = parseFloat(contratoCliente.consumo_fatura_1) || 0;
      const consumo2 = parseFloat(contratoCliente.consumo_fatura_2) || 0;
      const consumo3 = parseFloat(contratoCliente.consumo_fatura_3) || 0;

      const atualLance = parseFloat(contratoCliente.consumo_medio_kwh) || 0;
      const precoFinalKwh = parseFloat(contratoCliente.preco_final_kwh) || 0;

      const mediaConsumoAntigo = (consumo1 + consumo2 + consumo3) / 3;
      const mediaValorAntigo = (vlr1 + vlr2 + vlr3) / 3;
      const precoMedioAntigo = mediaConsumoAntigo > 0 ? mediaValorAntigo / mediaConsumoAntigo : 0;

      const valorSemSolaro = atualLance * precoMedioAntigo;
      const valorComDesconto = atualLance * precoFinalKwh;
      const economiaEstimada = valorSemSolaro - valorComDesconto;

      // Buscar histórico de faturas
      const sqlPagamentos = `
        SELECT data_pagamento, valor_total, status_pagamento
        FROM pagamento_cliente
        WHERE id_contrato = ?
        ORDER BY data_pagamento DESC
        LIMIT 6
      `;

      db.query(sqlPagamentos, [contratoId], (errPagamentos, resultPagamentos) => {
        if (errPagamentos) {
          console.error('Erro ao buscar faturas:', errPagamentos);
          return res.status(500).send('Erro ao carregar faturas do cliente.');
        }

        let faturas = resultPagamentos.map(pag => {
          const data = moment(pag.data_pagamento);
          const pendente = pag.status_pagamento === 'P';

          return {
            mes: data.format('MMM/YYYY'),
            valor: pag.valor_total > 0 ? `R$ ${pag.valor_total.toFixed(2)}` : '--',
            status: pendente ? 'Pendente' : 'Pago',
            statusClass: pendente ? 'danger' : 'success',
            mostrarBotaoPagar: pendente,
            forma_pagamento: !pendente && pag.forma_pagamento ? pag.forma_pagamento : '-'
          };
        });


        faturas = faturas.map(f => {
          const { ...resto } = f;
          return resto;
        });


        res.render('home_consumidor', {
          nomeFornecedor: req.session.usuario.nome,
          consumo_medio: atualLance.toFixed(2),
          valor_medio_contas: valorSemSolaro.toFixed(2),
          valor_com_desconto: valorComDesconto.toFixed(2),
          economia_estimada: economiaEstimada.toFixed(2),
          flag: contratoCliente.flag_cliente,
          data_assinatura: formatarData(contratoCliente.data_inicio),
          estado_cliente: contratoCliente.estado_cliente,
          contratosCliente: ativoClientesResults,
          status: contratoCliente.status,
          faturas // ← renderizado na tela
        });
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




