const db = require('../db/db');
const bcrypt = require('bcryptjs');
const moment = require('moment');


// CADASTRAR USUÁRIO
exports.cadastrarUsuario = async (req, res) => {
    const {
        cpf_cnpj, nome, contato, tipo,
        cep, rua, numero, bairro, cidade, estado, pais,
        cadastroEmail, cadastroSenha
    } = req.body;

    try {
        const verificarEmailSQL = `
            SELECT * FROM usuarios 
            WHERE email = ?
            `;

        db.query(verificarEmailSQL, [cadastroEmail], async (err, results) => {
            if (err) {
                console.error("Erro ao verificar email:", err);
                return res.status(500).send('Erro interno ao verificar email.');
            }

            if (results.length > 0) {
                req.session.alertaCadastro = {
                    campo: 'Email',
                    valor: cadastroEmail
                };
                return res.redirect('/form_cadastro');
            }

            // Continua cadastro normalmente
            const hashedSenha = await bcrypt.hash(cadastroSenha, 10);

            const insertUsuarioSQL = `
                INSERT INTO usuarios (
                    cpf_cnpj, nome, contato, tipo,
                    email, senha
                ) VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(insertUsuarioSQL, [
                cpf_cnpj, nome, contato, tipo,
                cadastroEmail, hashedSenha
            ], (err2, result) => {
                if (err2) {
                    console.error("Erro ao cadastrar usuário:", err2);
                    return res.status(500).send('Erro ao cadastrar usuário.');
                }

                const usuario_id = result.insertId;

                const insertEnderecoSQL = `
                    INSERT INTO enderecos (
                        usuario_id, cep, rua, numero, bairro, cidade, estado, pais
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(insertEnderecoSQL, [
                    usuario_id, cep, rua, numero, bairro, cidade, estado, pais
                ], (err3) => {
                    if (err3) {
                        console.error("Erro ao cadastrar endereço:", err3);
                        return res.status(500).send('Erro ao cadastrar endereço.');
                    }

                    res.redirect('/index?showLoginModal=true');
                });
            });
        });

    } catch (error) {
        console.error("Erro ao processar cadastro:", error);
        res.status(500).send('Erro ao processar cadastro.');
    }
};

// LOGIN DE USUÁRIO
exports.loginUsuario = async (req, res) => {
    const { loginEmail, loginSenha } = req.body;

    try {
        const sql = 'SELECT * FROM usuarios WHERE email = ?';
        db.query(sql, [loginEmail], async (err, results) => {
            if (err) return res.status(500).json({ erro: 'Erro no servidor.' });

            if (results.length === 0) {
                return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
            }

            const usuario = results[0];
            const senhaCorreta = await bcrypt.compare(loginSenha, usuario.senha);

            if (!senhaCorreta) {
                return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
            }

            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipo: usuario.tipo
            };

            if (usuario.tipo === 'C') {

                return res.json({ sucesso: true, redirect: '/home_consumidor' });
            }

            // TIPO FORNECEDOR
            if (usuario.tipo === 'F') {
                const contratoSQL = `
                    SELECT 
                        id,
                        usuario_id,
                        DATE_FORMAT(data_assinatura, '%d/%m/%Y') AS data_assinatura, 
                        DATE_FORMAT(data_final, '%d/%m/%Y') AS dataFinal, 
                        prazo_contrato,
                        estado_fazenda, 
                        preco_kwh, 
                        geracao_kwh,
                        status,
                        flag_fornecedor
                    FROM 
                        contratos_fornecedores
                    WHERE 
                        usuario_id = ? AND status = 'AT' AND flag_fornecedor = 1
                    ORDER BY 
                        id DESC LIMIT 1;
                `;

                db.query(contratoSQL, [usuario.id], (errContrato, resultadosContrato) => {
                    if (errContrato) return res.status(500).json({ erro: 'Erro ao buscar contrato.' });

                    if (resultadosContrato.length === 0) {
                        return res.json({ sucesso: true, redirect: '/home_fornecedor' });
                    }

                    const contrato = resultadosContrato[0];

                    req.session.usuario = {
                        ...req.session.usuario,
                        contrato_id: contrato.id,
                        usuario_id: contrato.usuario_id,
                        data_assinatura: formatarData(contrato.data_assinatura),
                        dataFinal: formatarData(contrato.dataFinal),
                        prazoContrato: contrato.prazo_contrato,
                        estado_fazenda: contrato.estado_fazenda,
                        preco_kwh: contrato.preco_kwh,
                        status: contrato.status,
                        geracao_kwh: contrato.geracao_kwh.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }),
                        flag_fornecedor: contrato.flag_fornecedor
                    };

                    const valorBase = contrato.preco_kwh * contrato.geracao_kwh;
                    let taxaMensal = 0;

                    switch (contrato.prazo_contrato) {
                        case 3: taxaMensal = 0.075; break;
                        case 6: taxaMensal = 0.05; break;
                        case 12: taxaMensal = 0.025; break;
                    }

                    const valorMensalComTaxa = parseFloat((valorBase * (1 + taxaMensal)).toFixed(2));
                    req.session.usuario.valorMensalComTaxa = valorMensalComTaxa;

                    const verificaRepasseSQL = `
                        SELECT * FROM recebimento_fornecedor 
                        WHERE id_contrato = ? 
                        ORDER BY dh_inclusao DESC 
                        LIMIT 1;
                    `;

                    db.query(verificaRepasseSQL, [contrato.id], (errRepasse, resultadosRepasse) => {
                        if (errRepasse) {
                            console.error("Erro ao verificar repasse:", errRepasse);
                            return res.status(500).json({ erro: 'Erro ao verificar repasse.' });
                        }

                        const hoje = new Date();
                        const mesAtual = hoje.getMonth();
                        const anoAtual = hoje.getFullYear();
                        let deveInserir = false;

                        if (resultadosRepasse.length === 0) {
                            deveInserir = true;
                        } else {
                            const ultimaData = new Date(resultadosRepasse[0].dh_inclusao);
                            if (
                                ultimaData.getMonth() !== mesAtual ||
                                ultimaData.getFullYear() !== anoAtual
                            ) {
                                deveInserir = true;
                            }
                        }

                        if (deveInserir) {
                            const valorMensal = valorMensalComTaxa;
                            const taxaAdm = parseFloat((taxaMensal * valorMensal).toFixed(2));
                            const valorRepasse = parseFloat((valorMensal - taxaAdm).toFixed(2));

                            const insertRepasseSQL = `
                                INSERT INTO recebimento_fornecedor
                                (id_contrato, id_fornecedor, valor_repasse, taxa_administrativa)
                                VALUES (?, ?, ?, ?);
                            `;

                            db.query(insertRepasseSQL, [
                                contrato.id,
                                contrato.usuario_id,
                                valorRepasse,
                                taxaAdm
                            ], (errInsert) => {
                                if (errInsert) {
                                    console.error("Erro ao inserir repasse:", errInsert);
                                    return res.status(500).json({ erro: 'Erro ao inserir repasse.' });
                                }

                                return res.json({ sucesso: true, redirect: '/home_fornecedor' });

                            });

                        } else {
                            return res.json({ sucesso: true, redirect: '/home_fornecedor' });
                        }
                    });
                });
            } else {
                return res.json({ sucesso: true, redirect: '/' });
            }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ erro: 'Erro inesperado no login.' });
    }
};

//GERADOR DE RECIBO DO FORNECEDOR
exports.recebimentoFornecedor = (req, res) => {
    const idFornecedor = req.session.usuario.id;
    const idContrato = req.session.usuario.contrato_id;

    if (!idFornecedor || !idContrato) {
        return res.status(400).json({ erro: 'Sessão inválida. Fornecedor ou contrato não encontrado.' });
    }

    const sql = `
        UPDATE recebimento_fornecedor
        SET status_repasse = 'PAG',
            data_repasse = CURDATE()
        WHERE id_fornecedor = ? AND id_contrato = ?;
    `;

    db.query(sql, [idFornecedor, idContrato], (err, result) => {
        if (err) {
            console.error("Erro ao atualizar status de repasse:", err);
            return res.status(500).json({ erro: 'Erro ao atualizar repasse.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Nenhum repasse encontrado para atualizar.' });
        }

        return res.redirect('/home_fornecedor');
    });
};



// CADASTRAR CONTRATO FORNECEDOR
exports.cadastrarContrato = (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).send('Usuário não está autenticado.');
    }

    const { preco_kwh, geracao_kwh, prazo_contrato, estado_fazenda } = req.body;
    const usuario_id = req.session.usuario.id;
    const meses = parseInt(prazo_contrato);

    if (!usuario_id) {
        return res.status(400).send('ID do usuário inválido na sessão.');
    }

    if (![3, 6, 12].includes(meses)) {
        return res.status(400).send('Prazo de contrato inválido');
    }

    const sqlContrato = `
        INSERT INTO contratos_fornecedores (
            usuario_id, data_assinatura, data_final, prazo_contrato,
            estado_fazenda, preco_kwh, geracao_kwh, flag_fornecedor
        )
        VALUES (?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, ?, ?, ?, 1)
    `;

    const sqlInsereEstoque = `
        UPDATE estoque_kwh_estado SET kwh_disponivel = kwh_disponivel + ? 
        WHERE estado = ?
    `;

    db.query(sqlInsereEstoque, [geracao_kwh, estado_fazenda], (errEstoque) => {
        if (errEstoque) {
            console.error('Erro ao atualizar estoque:', errEstoque);
            return res.status(500).send('Erro ao cadastrar contrato.');
        }

        db.query(sqlContrato, [usuario_id, meses, meses, estado_fazenda, preco_kwh, geracao_kwh], (errContrato, resultadoContrato) => {
            if (errContrato) {
                console.error('Erro ao cadastrar contrato:', errContrato);
                return res.status(500).send('Erro ao cadastrar contrato.');
            }

            const contratoId = resultadoContrato.insertId;

            const valorBase = preco_kwh * geracao_kwh;

            let taxaMensal = 0;
            switch (meses) {
                case 3: taxaMensal = 0.075; break;
                case 6: taxaMensal = 0.05; break;
                case 12: taxaMensal = 0.025; break;
            }

            const valorMensal = parseFloat((valorBase * (1 + taxaMensal)).toFixed(2));
            const taxaAdm = parseFloat((taxaMensal * valorMensal).toFixed(2));
            const valorRepasse = parseFloat((valorMensal - taxaAdm).toFixed(2));

            const insertRepasseSQL = `
                INSERT INTO recebimento_fornecedor
                (id_contrato, id_fornecedor, valor_repasse, taxa_administrativa)
                VALUES (?, ?, ?, ?)
            `;

            db.query(insertRepasseSQL, [contratoId, usuario_id, valorRepasse, taxaAdm], (errRepasse) => {
                if (errRepasse) {
                    console.error('Erro ao inserir primeiro repasse:', errRepasse);
                    return res.status(500).send('Erro ao registrar repasse inicial.');
                }
                return res.redirect('/home_fornecedor');

            });
        });
    });
};


// CADASTRO DE CONTRATO CLIENTE
exports.cadastrarContratoCliente = (req, res) => {
    const {
        kwh1, kwh2, kwh3,
        conta1, conta2, conta3
    } = req.body;

    const usuarioId = req.session.usuario.id;

    const sqlEndereco = `SELECT estado FROM enderecos WHERE usuario_id = ? LIMIT 1`;
    db.query(sqlEndereco, [usuarioId], (errEndereco, resultadosEndereco) => {
        if (errEndereco) {
            console.error("Erro ao buscar estado do cliente:", errEndereco);
            return res.status(500).send("Erro ao buscar estado do cliente.");
        }

        if (resultadosEndereco.length === 0) {
            return res.status(400).send("Endereço não encontrado para o cliente.");
        }

        const estadoCliente = resultadosEndereco[0].estado;

        const kwh1f = parseFloat(kwh1);
        const kwh2f = parseFloat(kwh2);
        const kwh3f = parseFloat(kwh3);
        const conta1f = parseFloat(conta1);
        const conta2f = parseFloat(conta2);
        const conta3f = parseFloat(conta3);

        const consumoMedio = (kwh1f + kwh2f + kwh3f) / 3;
        const mediaFatura = (conta1f + conta2f + conta3f) / 3;

        if (isNaN(consumoMedio) || isNaN(mediaFatura)) {
            return res.status(400).send("Valores numéricos inválidos.");
        }

        const sqlEstoque = `
            SELECT id, kwh_disponivel 
            FROM estoque_kwh_estado 
            WHERE estado = ? AND kwh_disponivel >= ? 
            LIMIT 1
        `;
        db.query(sqlEstoque, [estadoCliente, consumoMedio], (errEstoque, resultadosEstoque) => {
            if (errEstoque) {
                console.error("Erro ao verificar estoque:", errEstoque);
                return res.status(500).send("Erro ao verificar estoque.");
            }

            if (resultadosEstoque.length === 0) {
                return res.redirect('/home_consumidor?estoque=indisponivel');
            }

            const estoqueId = resultadosEstoque[0].id;

            const sqlPrecos = `
                SELECT preco_kwh 
                FROM contratos_fornecedores 
                WHERE estado_fazenda = ? AND status = 'AT' AND flag_fornecedor = 1
            `;
            db.query(sqlPrecos, [estadoCliente], (errPrecos, resultadosPrecos) => {
                if (errPrecos) {
                    console.error("Erro ao buscar preços dos fornecedores:", errPrecos);
                    return res.status(500).send("Erro ao buscar preços dos fornecedores.");
                }

                if (resultadosPrecos.length === 0) {
                    return res.redirect('/home_consumidor?estoque=indisponivel');
                }

                const somaPrecos = resultadosPrecos.reduce((total, row) => total + parseFloat(row.preco_kwh), 0);
                const mediaPrecos = somaPrecos / resultadosPrecos.length;

                const sqlTaxa = `SELECT taxa FROM taxa_estaduais WHERE estado = ? LIMIT 1`;
                db.query(sqlTaxa, [estadoCliente], (errTaxa, resultadosTaxa) => {
                    if (errTaxa) {
                        console.error("Erro ao buscar taxa estadual:", errTaxa);
                        return res.status(500).send("Erro ao buscar taxa estadual.");
                    }

                    if (resultadosTaxa.length === 0) {
                        return res.status(400).send("Taxa estadual não encontrada.");
                    }

                    const taxa = parseFloat(resultadosTaxa[0].taxa);
                    const precoFinalComDesconto = parseFloat((mediaPrecos * (1 + taxa / 100)).toFixed(4));
                    const precoFinalKwh = precoFinalComDesconto * 0.85;
                    const valorComNovoPreco = precoFinalKwh * consumoMedio;
                    const vlrEconomizado = parseFloat((mediaFatura - valorComNovoPreco).toFixed(2));

                    console.log("vlrEconomizado ", vlrEconomizado);

                    const sqlContratoCliente = `
                        INSERT INTO contratos_clientes 
                        (usuario_id, data_inicio, estado_cliente, consumo_medio_kwh, preco_final_kwh, status,
                        consumo_fatura_1, consumo_fatura_2, consumo_fatura_3,
                        consumo_media_fatura, valor_fatura_1, valor_fatura_2, valor_fatura_3, media_valor_fatura, flag_cliente, valor_economizado)
                        VALUES (?, NOW(), ?, ?, ?, 'A', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                    `;
                    const paramsContrato = [
                        usuarioId, estadoCliente, consumoMedio, precoFinalKwh,
                        kwh1f, kwh2f, kwh3f, consumoMedio,
                        conta1f, conta2f, conta3f, mediaFatura, vlrEconomizado
                    ];

                    db.query(sqlContratoCliente, paramsContrato, (errContrato, resultContrato) => {
                        if (errContrato) {
                            console.error("Erro ao cadastrar contrato do cliente:", errContrato);
                            return res.status(500).send("Erro ao cadastrar contrato do cliente.");
                        }

                        const contratoClienteId = resultContrato.insertId;

                        const precoBaseFornecedor = parseFloat(mediaPrecos.toFixed(4));
                        const taxaPercentual = taxa;
                        const precoFinalCliente = precoFinalKwh;

                        const sqlHistorico = `
                            INSERT INTO historico_precos 
                            (usuario_id, contrato_cliente_id, estado, preco_base_fornecedor, taxa_percentual, preco_final_cliente, data_inicio) 
                            VALUES (?, ?, ?, ?, ?, ?, SYSDATE())
                        `;

                        db.query(
                            sqlHistorico,
                            [usuarioId, contratoClienteId, estadoCliente, precoBaseFornecedor, taxaPercentual, precoFinalCliente],
                            (errHist) => {
                                if (errHist) {
                                    console.error("Erro ao inserir histórico de preços:", errHist);
                                    return res.status(500).send("Erro ao salvar histórico de preços.");
                                }

                                const valorFaturaComDesconto = parseFloat((consumoMedio * precoFinalKwh).toFixed(2));
                                const hoje = new Date();
                                const dataPagamento = hoje.toISOString().split('T')[0];

                                const sqlPagamento = `
                                    INSERT INTO pagamento_cliente
                                    (id_contrato, id_cliente, valor_total, data_pagamento, forma_pagamento, status_pagamento)
                                    VALUES (?, ?, ?, ?, ?, ?)
                                `;
                                const dadosPagamento = [
                                    contratoClienteId,
                                    usuarioId,
                                    valorFaturaComDesconto,
                                    dataPagamento,
                                    'A definir',
                                    'PEND'
                                ];

                                db.query(sqlPagamento, dadosPagamento, (errPagamento) => {
                                    if (errPagamento) {
                                        console.error("Erro ao inserir pagamento pendente:", errPagamento);
                                        return res.status(500).send("Erro ao registrar pagamento pendente.");
                                    }

                                    const sqlUpdateEstoque = `
                                        UPDATE estoque_kwh_estado 
                                        SET kwh_disponivel = kwh_disponivel - ? 
                                        WHERE id = ?
                                    `;
                                    db.query(sqlUpdateEstoque, [consumoMedio, estoqueId], (errUpdateEstoque) => {
                                        if (errUpdateEstoque) {
                                            console.error("Erro ao atualizar estoque:", errUpdateEstoque);
                                            return res.status(500).send("Erro ao atualizar estoque.");
                                        }

                                        return res.redirect('/home_consumidor');
                                    });
                                });
                            }
                        );
                    });
                });
            });
        });
    });
};


// LANÇADOR DE KWH (CLIENTE)
exports.salvarKwh = (req, res) => {
    if (!req.session || !req.session.usuario) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const { kwh_gerado, mes_referencia } = req.body;
    const userId = req.session.usuario.id;

    const sqlBuscaContrato = `
        SELECT * FROM contratos_clientes
        WHERE usuario_id = ?
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(sqlBuscaContrato, [userId], (err, resultContrato) => {
        if (err) return res.status(500).send('Erro ao buscar contrato.');
        if (resultContrato.length === 0) return res.status(404).send('Contrato não encontrado.');

        const contrato = resultContrato[0];
        const idContrato = contrato.id;
        const estado = contrato.estado_cliente;
        const precoFinalKwh = parseFloat(contrato.preco_final_kwh);
        const mediaValorFatura = parseFloat(contrato.media_valor_fatura);
        const consumoAntigo = parseFloat(contrato.consumo_medio_kwh);
        const consumoNovo = parseFloat(kwh_gerado);
        const precoBaseFornecedor = parseFloat(mediaValorFatura.toFixed(2));
        const anoAtual = new Date().getFullYear();
        const mesReferencia = mes_referencia;

        let dataReferencia = '';

        console.log('Mês: ', mesReferencia);

        switch (parseInt(mesReferencia)) {
            case 1:
                dataReferencia = `${anoAtual}-01-01`;
                break;
            case 2:
                dataReferencia = `${anoAtual}-02-01`;
                break;
            case 3:
                dataReferencia = `${anoAtual}-03-01`;
                break;
            case 4:
                dataReferencia = `${anoAtual}-04-01`;
                break;
            case 5:
                dataReferencia = `${anoAtual}-05-01`;
                break;
            case 6:
                dataReferencia = `${anoAtual}-06-01`;
                break;
            case 7:
                dataReferencia = `${anoAtual}-07-01`;
                break;
            case 8:
                dataReferencia = `${anoAtual}-08-01`;
                break;
            case 9:
                dataReferencia = `${anoAtual}-09-01`;
                break;
            case 10:
                dataReferencia = `${anoAtual}-10-01`;
                break;
            case 11:
                dataReferencia = `${anoAtual}-11-01`;
                break;
            case 12:
                dataReferencia = `${anoAtual}-12-01`;
                break;
            default:
                return res.status(400).send('Mês inválido.');
        }

        const sqlFechaHistoricoAnterior = `
            UPDATE historico_precos
            SET data_fim = CURDATE()
            WHERE contrato_cliente_id = ?
              AND usuario_id = ?
              AND data_fim IS NULL
        `;


        db.query(sqlFechaHistoricoAnterior, [idContrato, userId], (errFechar) => {
            if (errFechar) return res.status(500).send('Erro ao fechar histórico anterior.');

            const sqlNovoHistorico = `
                INSERT INTO historico_precos (
                    usuario_id,
                    estado,
                    preco_base_fornecedor,
                    taxa_percentual,
                    preco_final_cliente,
                    data_inicio,
                    data_fim,
                    contrato_cliente_id
                )
                SELECT
                    ?, ?, ?, taxa_percentual, preco_final_cliente, ?, NULL, contrato_cliente_id
                FROM historico_precos
                WHERE contrato_cliente_id = ?
                  AND usuario_id = ?
                ORDER BY id DESC
                LIMIT 1
            `;

            db.query(sqlNovoHistorico, [userId, estado, precoBaseFornecedor, dataReferencia, idContrato, userId], (err1) => {
                if (err1) return res.status(500).send('Erro ao registrar histórico.');

                const sqlAddEstoque = `
                    UPDATE estoque_kwh_estado
                    SET kwh_disponivel = kwh_disponivel + ?
                    WHERE estado = ?
                `;
                db.query(sqlAddEstoque, [consumoAntigo, estado], (err2) => {
                    if (err2) return res.status(500).send('Erro ao ajustar estoque antigo.');

                    const sqlAtualizaConsumo = `
                        UPDATE contratos_clientes
                        SET consumo_medio_kwh = ?
                        WHERE id = ?
                    `;
                    db.query(sqlAtualizaConsumo, [consumoNovo, idContrato], (err3) => {
                        if (err3) return res.status(500).send('Erro ao atualizar contrato.');

                        const sqlDeduzEstoque = `
                            UPDATE estoque_kwh_estado
                            SET kwh_disponivel = kwh_disponivel - ?
                            WHERE estado = ?
                        `;
                        db.query(sqlDeduzEstoque, [consumoNovo, estado], (err4) => {
                            if (err4) return res.status(500).send('Erro ao ajustar estoque novo.');

                            const novoValorFatura = parseFloat((precoFinalKwh * consumoNovo).toFixed(2));
                            const sqlAtualizaFatura = `
                                UPDATE contratos_clientes
                                SET media_valor_fatura = ?, valor_economizado = ?
                                WHERE id = ?
                            `;

                            const precoMedioAnteriorKwh = mediaValorFatura / consumoAntigo;
                            const valorAnterior = consumoNovo * precoMedioAnteriorKwh;
                            const valorAtual = consumoNovo * precoFinalKwh;
                            const valorEconomizado = parseFloat((valorAnterior - valorAtual).toFixed(2));

                            const valorFaturaComDesconto = parseFloat(valorAtual.toFixed(2));
                            const dataPagamento = new Date(dataReferencia).toISOString().split('T')[0];

                            console.log("Valor economizado:", valorEconomizado);

                            const sqlPagamento = `
                                        INSERT INTO pagamento_cliente
                                        (id_contrato, id_cliente, valor_total, data_pagamento, forma_pagamento, status_pagamento)
                                        VALUES (?, ?, ?, ?, ?, ?)
                                    `;

                            const dadosPagamento = [
                                idContrato,
                                userId,
                                valorFaturaComDesconto,
                                dataPagamento,
                                'A definir',
                                'PEND'
                            ];


                            db.query(sqlPagamento, dadosPagamento, (errPagamento) => {
                                if (errPagamento) {
                                    console.error("Erro ao inserir pagamento pendente:", errPagamento);
                                    return res.status(500).send("Erro ao registrar pagamento pendente.");
                                }

                                db.query(sqlAtualizaFatura, [novoValorFatura, valorEconomizado, idContrato], (err5) => {
                                    if (err5) return res.status(500).send('Erro ao atualizar fatura.');

                                    return res.redirect('/home_consumidor?refresh=1');
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};


exports.renderHomeFornecedor = (req, res) => {
    res.render('home_fornecedor', { resultado_calculado: null });
};

// PROCESSAMENTO SIMULAÇÃO CLIENTE
exports.processaSimulacao = (req, res) => {
    const { kwh1, kwh2, kwh3, conta1, conta2, conta3 } = req.body;

    const usuario_id = req.session.usuario?.id;

    if (!usuario_id) {
        return res.status(401).send("Usuário não autenticado.");
    }

    const sqlEstado = `SELECT estado FROM enderecos WHERE usuario_id = ? LIMIT 1`;

    db.query(sqlEstado, [usuario_id], (errEstado, resultadoEstado) => {
        if (errEstado) {
            console.error("Erro ao buscar estado do usuário:", errEstado);
            return res.status(500).send("Erro ao buscar endereço do usuário.");
        }

        if (resultadoEstado.length === 0) {
            return res.status(400).send("Endereço do usuário não encontrado.");
        }

        const estado_fazenda_sim = resultadoEstado[0].estado;
        console.log('UF: ', estado_fazenda_sim);

        const kwh1f = parseFloat(kwh1);
        const kwh2f = parseFloat(kwh2);
        const kwh3f = parseFloat(kwh3);
        const conta1f = parseFloat(conta1);
        const conta2f = parseFloat(conta2);
        const conta3f = parseFloat(conta3);

        const consumoMedio = (kwh1f + kwh2f + kwh3f) / 3;
        const mediaFatura = (conta1f + conta2f + conta3f) / 3;

        if (isNaN(consumoMedio) || isNaN(mediaFatura)) {
            return res.status(400).send("Valores numéricos inválidos.");
        }

        const sqlPrecos = `
            SELECT preco_kwh 
            FROM contratos_fornecedores 
            WHERE estado_fazenda = ? AND status = 'AT' AND flag_fornecedor = 1
        `;

        db.query(sqlPrecos, [estado_fazenda_sim], (errPrecos, resultadosPrecos) => {
            if (errPrecos) {
                console.error("Erro ao buscar preços dos fornecedores:", errPrecos);
                return res.status(500).send("Erro ao buscar preços dos fornecedores.");
            }

            if (resultadosPrecos.length === 0) {
                return res.status(400).send("Nenhum fornecedor ativo encontrado no estado.");
            }

            const somaPrecos = resultadosPrecos.reduce((total, row) => total + parseFloat(row.preco_kwh), 0);
            const mediaPrecos = somaPrecos / resultadosPrecos.length;

            const taxaSQL = `SELECT taxa FROM taxa_estaduais WHERE estado = ? LIMIT 1`;
            db.query(taxaSQL, [estado_fazenda_sim], (errTaxa, resultadosTaxa) => {
                if (errTaxa) return res.status(500).send('Erro ao buscar taxa estadual.');
                if (resultadosTaxa.length === 0) return res.status(400).send('Taxa estadual não encontrada.');

                const taxaEstadual = resultadosTaxa[0].taxa / 100;

                const precoComTaxa = mediaPrecos * (1 + taxaEstadual);
                const precoFinalComDesconto = precoComTaxa * 0.85;

                const valorMensalFinal = parseFloat((precoFinalComDesconto * consumoMedio).toFixed(2));

                res.render('home_consumidor', {
                    ...req.session.usuario,
                    resultado_calculado: valorMensalFinal
                });
            });
        });
    });
};

// RESCISÃO DE CONTRATO (FORNECEDOR)
exports.rescindirContrato = (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const usuario_id = req.session.usuario.id;
    const dataRescisao = new Date();
    const geracaoKwh = req.session.usuario.geracao_kwh;

    if (!geracaoKwh) {
        return res.status(400).send('Valor de geração kWh não disponível na sessão.');
    }

    const kwhFormatado = parseFloat(
        geracaoKwh.replace('.', '').replace(',', '.')
    ) * -1;


    const sqlUpdate = `
        UPDATE contratos_fornecedores
        SET 
            data_rescisao = ?, 
            status = 'RE',
            flag_fornecedor = NULL
        WHERE usuario_id = ? AND status = 'AT'
    `;

    const sqlRemoveEstoque = `
        UPDATE estoque_kwh_estado 
            SET kwh_disponivel = kwh_disponivel + ? 
            WHERE id = ?
    `;

    db.query(sqlRemoveEstoque, [kwhFormatado, usuario_id], (err2) => {
        if (err2) {
            console.error('Erro ao cadastrar contrato:', err2);
            return res.status(500).send('Erro ao cadastrar contrato.');
        };
    });

    db.query(sqlUpdate, [dataRescisao, usuario_id], (err, result) => {
        if (err) return res.status(500).send('Erro ao rescindir contrato.');
        if (result.affectedRows === 0) return res.status(404).send('Nenhum contrato ativo encontrado para rescindir.');
        flagRescisao = 1;
        return res.json({ success: true, message: "Contrato rescindido com sucesso." });

    });
};


function formatarData(data) {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

// LOAD CONTRATOS (FORNECEDOR)
exports.carregarContratosUsuario = (req, res) => {
    const userId = req.session.userId;

    const query = `
    SELECT 
      data_assinatura, 
      data_final, 
      data_rescisao, 
      prazo_contrato, 
      estado_fazenda, 
      preco_kwh, 
      geracao_kwh, 
      status
    FROM contrato_fornecedores
    WHERE usuario_id = ?
  `;

    db.query(query, [userId], (err, resultados) => {
        if (err) {
            console.error('Erro ao buscar contratos:', err);
            return res.status(500).send('Erro no servidor');
        }

        const contratosFormatados = resultados.map(contrato => {
            const status = contrato.status?.trim();
            const dataFinalOuRescisao = status === 'RE' ? contrato.data_rescisao : contrato.data_final;

            return {
                ...contrato,
                data_assinatura: formatarData(contrato.data_assinatura),
                data_final: formatarData(dataFinalOuRescisao),
                status: status,
                status_legivel: status === 'AT' ? 'Ativo' : 'Inativo'
            };
        });

        res.render('home_fornecedor', { contratos: contratosFormatados });
    });
};

//LOAD FATURA (CLIENTE)
exports.carregaFaturaCliente = (req, res) => {
    if (!req.session || !req.session.usuario) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const userId = req.session.usuario.id;

    const sqlContrato = `
        SELECT id FROM contratos_clientes
        WHERE usuario_id = ?
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(sqlContrato, [userId], (errContrato, resultContrato) => {
        if (errContrato) return res.status(500).send('Erro ao buscar contrato.');
        if (resultContrato.length === 0) return res.status(404).send('Contrato não encontrado.');

        const contratoId = resultContrato[0].id;

        const sqlPagamentos = `
            SELECT data_pagamento, valor_total, status_pagamento
            FROM pagamento_cliente
            WHERE id_contrato = ?
            ORDER BY data_pagamento DESC
            LIMIT 6
        `;

        db.query(sqlPagamentos, [contratoId], (errPagamentos, resultPagamentos) => {
            if (errPagamentos) return res.status(500).send('Erro ao buscar faturas.');

            const faturas = resultPagamentos.map(pag => {
                const data = moment(pag.data_pagamento);
                return {
                    mes: data.format('MMM/YYYY'), 
                    kwh: pag.valor_total > 0 ? (pag.valor_total / 0.5).toFixed(2) : '--', 
                    valor: pag.valor_total > 0 ? `R$ ${pag.valor_total.toFixed(2)}` : '--',
                    status: pag.status_pagamento === 'P' ? 'Faturado' : 'Aguardando Lançamento',
                    statusClass: pag.status_pagamento === 'P' ? 'success' : 'warning'
                };
            });

            return res.json({ success: true, message: "Contrato rescindido com sucesso." });

        });
    });
};

// ACEITE DE PAGAMENTO (CLIENTE)
exports.confirmarPagamento = async (req, res) => {
    const { id_fatura, metodo } = req.body;

    if (!id_fatura || !metodo) {
        return res.status(400).send('Dados incompletos');
    }

    try {
        const dataPagamento = new Date().toISOString().split('T')[0];

        await db.query(`
      UPDATE pagamento_cliente
      SET status = 'PAGO',
          data_pagamento = ?,
          forma_pagamento = ?
      WHERE id_pagamento_cliente = ?
    `, [dataPagamento, metodo, id_fatura]);

        res.redirect('/pagina_faturas'); 
    } catch (err) {
        console.error('Erro ao confirmar pagamento:', err);
        res.status(500).send('Erro no servidor');
    }
};

// ACEITE DE PAGAMENTO (CLIENTE)
exports.confirmarPagamentoCliente = async (req, res) => {

    console.log('Dados recebidos:', req.body);

    const { id_fatura, metodo } = req.body;

    if (!id_fatura || !metodo) {
        return res.status(400).send('Dados incompletos');
    }

    try {
        const dataPagamento = new Date().toISOString().split('T')[0];

        await db.query(`
      UPDATE pagamento_cliente
      SET status_pagamento = 'PAGO',
          data_pagamento = ?,
          forma_pagamento = ?
      WHERE id_pagamento = ?
    `, [dataPagamento, metodo, id_fatura]);

        res.redirect('/home_consumidor'); 
    } catch (err) {
        console.error('Erro ao confirmar pagamento:', err);
        res.status(500).send('Erro no servidor');
    }
};


// LOAD DADOS DO DASHBOARD
exports.getDashboard = async (req, res) => {
    const sqlFornecedores = `
    SELECT COUNT(*) AS total FROM contratos_fornecedores WHERE status = ?
  `;
    const dadosFornecedores = ['AT'];

    const sqlClientes = `
    SELECT COUNT(*) AS total FROM contratos_clientes WHERE status = ?
  `;
    const dadosClientes = ['A'];

    const sqlKwh = `
    SELECT estado, kwh_disponivel FROM estoque_kwh_estado
  `;

    const sqlFornecedoresEstado = `
    SELECT estado_fazenda, COUNT(*) AS total 
    FROM contratos_fornecedores 
    WHERE status = ?
    GROUP BY estado_fazenda
  `;
    const dadosFornecedoresEstado = ['AT'];

    const sqlClientesEstado = `
    SELECT estado_cliente, COUNT(*) AS total 
    FROM contratos_clientes 
    WHERE status = ?
    GROUP BY estado_cliente
  `;
    const dadosClientesEstado = ['A'];

    db.query(sqlFornecedores, dadosFornecedores, (err, fornecedoresResult) => {
        if (err) {
            console.error("Erro ao buscar total fornecedores:", err);
            return res.status(500).send("Erro ao buscar total fornecedores.");
        }

        db.query(sqlClientes, dadosClientes, (err, clientesResult) => {
            if (err) {
                console.error("Erro ao buscar total clientes:", err);
                return res.status(500).send("Erro ao buscar total clientes.");
            }

            db.query(sqlKwh, [], (err, kwhResult) => {
                if (err) {
                    console.error("Erro ao buscar kWh disponíveis:", err);
                    return res.status(500).send("Erro ao buscar kWh disponíveis.");
                }

                db.query(sqlFornecedoresEstado, dadosFornecedoresEstado, (err, fornecedoresEstadoResult) => {
                    if (err) {
                        console.error("Erro ao buscar fornecedores por estado:", err);
                        return res.status(500).send("Erro ao buscar fornecedores por estado.");
                    }

                    db.query(sqlClientesEstado, dadosClientesEstado, (err, clientesEstadoResult) => {
                        if (err) {
                            console.error("Erro ao buscar consumidores por estado:", err);
                            return res.status(500).send("Erro ao buscar consumidores por estado.");
                        }
                        console.log("Fornecedores:", fornecedoresResult[0].total);
                        console.log("Consumidores:", clientesResult[0].total);
                        console.log("kwhPorEstado:", JSON.stringify(kwhResult));
                        console.log("fornecedoresPorEstado:", JSON.stringify(fornecedoresEstadoResult));
                        console.log("consumidoresPorEstado:", JSON.stringify(clientesEstadoResult));


                        res.render('dash', {
                            totalFornecedores: fornecedoresResult[0].total,
                            totalClientes: clientesResult[0].total,
                            kwhPorEstado: JSON.stringify(kwhResult),
                            fornecedoresPorEstado: JSON.stringify(fornecedoresEstadoResult),
                            consumidoresPorEstado: JSON.stringify(clientesEstadoResult)
                        });

                    });
                });
            });
        });
    });
};

// RESCISÃO CONTRATO (CLIENTE)
exports.rescindirContratoCliente = (req, res) => {

    const idUsuario = req.session.usuario.id;

    const sqlContrato = `
        SELECT id, consumo_medio_kwh, estado_cliente 
        FROM contratos_clientes 
        WHERE usuario_id = ? AND status = "A"
    `;
    const dadosContrato = [idUsuario];

    db.query(sqlContrato, dadosContrato, (err, contratoResult) => {
        if (err) {
            console.error("Erro ao buscar contrato do usuário:", err);
            return res.status(500).json({ success: false, message: "Erro ao buscar contrato." });
        }

        if (contratoResult.length === 0) {
            return res.json({ success: false, message: "Contrato ativo não encontrado." });
        }

        const contrato = contratoResult[0];

        const sqlPendencias = `
            SELECT id_pagamento 
            FROM pagamento_cliente 
            WHERE id_contrato = ? AND status_pagamento = "PEND"
        `;
        const dadosPendencias = [contrato.id];

        db.query(sqlPendencias, dadosPendencias, (err, pendenciasResult) => {
            if (err) {
                console.error("Erro ao verificar pendências:", err);
                return res.status(500).json({ success: false, message: "Erro ao verificar pendências." });
            }

            if (pendenciasResult.length > 0) {
                return res.json({
                    success: false,
                    message: "Existem faturas em aberto. É necessário quitar os débitos para rescindir o contrato."
                });
            }

            const sqlAtualizaEstoque = `
                UPDATE estoque_kwh_estado 
                SET kwh_disponivel = kwh_disponivel + ? 
                WHERE estado = ?
            `;
            const dadosEstoque = [contrato.consumo_medio_kwh, contrato.estado_cliente];

            db.query(sqlAtualizaEstoque, dadosEstoque, (err) => {
                if (err) {
                    console.error("Erro ao atualizar estoque:", err);
                    return res.status(500).json({ success: false, message: "Erro ao atualizar estoque." });
                }

                const sqlUpdateContrato = `
                    UPDATE contratos_clientes 
                    SET data_cancelamento = NOW(), flag_cliente = NULL, status = "C"
                    WHERE id = ?
                `;
                const dadosUpdate = [contrato.id];

                db.query(sqlUpdateContrato, dadosUpdate, (err) => {
                    if (err) {
                        console.error("Erro ao atualizar contrato:", err);
                        return res.status(500).json({ success: false, message: "Erro ao cancelar contrato." });
                    }

                    return res.json({ success: true, message: "Contrato rescindido com sucesso." });
                });
            });
        });
    });
};

// FUNÇÃO PARA FORMATAR DATA PT-BR
function formatarData(data) {
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}
