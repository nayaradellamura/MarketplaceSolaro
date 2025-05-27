const db = require('../db/db');
const bcrypt = require('bcrypt');
const Swal = require('sweetalert2');
const moment = require('moment');


// CADASTRAR USUÁRIO
exports.cadastrarUsuario = async (req, res) => {
    const {
        cpf_cnpj, nome, contato, tipo,
        cep, rua, numero, bairro, cidade, estado, pais,
        cadastroEmail, cadastroSenha
    } = req.body;

    try {
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
        ], (err, result) => {
            if (err) {
                console.error("Erro ao cadastrar usuário:", err);
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
            ], (err2) => {
                if (err2) {
                    console.error("Erro ao cadastrar endereço:", err2);
                    return res.status(500).send('Erro ao cadastrar endereço.');
                }

                res.redirect('/index?showLoginModal=true');
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
            if (err) return res.status(500).send('Erro no servidor.');

            if (results.length === 0) {
                return res.redirect('/index?showLoginModal=true&loginError=true');
            }

            const usuario = results[0];
            const senhaCorreta = await bcrypt.compare(loginSenha, usuario.senha);

            if (!senhaCorreta) {
                return res.redirect('/index?showLoginModal=true&loginError=true');
            }

            // Inicializa sessão do usuário
            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipo: usuario.tipo
            };

            if (usuario.tipo === 'C') {
                return res.redirect('/home_consumidor');

                

            } else if (usuario.tipo === 'F') {
                const contratoSQL = `
                    SELECT 
                        c.id AS id,
                        c.usuario_id,
                        DATE_FORMAT(c.data_assinatura, '%d/%m/%Y') AS data_assinatura, 
                        DATE_FORMAT(c.data_final, '%d/%m/%Y') AS dataFinal, 
                        c.prazo_contrato,
                        c.estado_fazenda, 
                        c.preco_kwh, 
                        c.geracao_kwh,
                        t.taxa,
                        c.status,
                        c.flag_fornecedor
                    FROM 
                        contratos_fornecedores c
                    JOIN 
                        taxa_estaduais t ON c.estado_fazenda = t.estado
                    WHERE 
                        c.usuario_id = ? AND c.status = 'AT' AND c.flag_fornecedor = 1
                    ORDER BY 
                        c.id DESC
                    LIMIT 1;
                `;

                db.query(contratoSQL, [usuario.id], (errContrato, resultadosContrato) => {
                    if (errContrato) return res.status(500).send('Erro ao buscar contrato.');

                    if (resultadosContrato.length > 0) {
                        const contrato = resultadosContrato[0];

                        req.session.usuario = {
                            ...req.session.usuario,
                            id: contrato.id,
                            usuario_id: contrato.usuario_id,
                            data_assinatura: formatarData(contrato.data_assinatura),
                            dataFinal: formatarData(contrato.dataFinal),
                            prazoContrato: contrato.prazo_contrato,
                            estado_fazenda: contrato.estado_fazenda,
                            preco_kwh: contrato.preco_kwh,
                            status: contrato.status,
                            geracao_kwh: contrato.geracao_kwh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                            taxa: contrato.taxa,
                            flag_fornecedor: contrato.flag_fornecedor
                        };

                        console.log('Contrato carregado do fornecedor:', contrato);

                        const taxaEstadual = contrato.taxa / 100;
                        const precoComTaxa = contrato.preco_kwh * (1 + taxaEstadual);
                        const valorBase = precoComTaxa * contrato.geracao_kwh;

                        let taxaMensal = 0;
                        switch (contrato.prazo_contrato) {
                            case 3: taxaMensal = 0.075; break;
                            case 6: taxaMensal = 0.05; break;
                            case 12: taxaMensal = 0.025; break;
                            default: taxaMensal = 0;
                        }

                        const valorMensalComTaxa = valorBase * (1 + taxaMensal);
                        req.session.usuario.valorMensalComTaxa = valorMensalComTaxa.toFixed(2);
                    }

                    return res.redirect('/home_fornecedor');
                });
            } else {
                return res.redirect('/');
            }
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).send('Erro interno.');
    }
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

    db.query(sqlContrato, [usuario_id, meses, meses, estado_fazenda, preco_kwh, geracao_kwh], (err2) => {
        if (err2) {
            console.error('Erro ao cadastrar contrato:', err2);
            return res.status(500).send('Erro ao cadastrar contrato.');
        }

        return res.redirect('/home_fornecedor');
    });
};

exports.cadastrarContratoCliente = (req, res) => {
    const {
        kwh1, kwh2, kwh3,
        conta1, conta2, conta3
    } = req.body;

    const usuarioId = req.session.usuario.id;

    // Buscar estado do cliente
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

        // Converter valores
        const kwh1f = parseFloat(kwh1);
        const kwh2f = parseFloat(kwh2);
        const kwh3f = parseFloat(kwh3);
        const conta1f = parseFloat(conta1);
        const conta2f = parseFloat(conta2);
        const conta3f = parseFloat(conta3);

        // Calcular consumo médio e fatura média
        const consumoMedio = (kwh1f + kwh2f + kwh3f) / 3;
        const mediaFatura = (conta1f + conta2f + conta3f) / 3;

        if (isNaN(consumoMedio) || isNaN(mediaFatura)) {
            return res.status(400).send("Valores numéricos inválidos.");
        }

        // Verificar estoque disponível
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

            // Buscar preços dos fornecedores ativos
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
                    return res.status(400).send("Nenhum fornecedor ativo no estado do cliente.");
                }

                const somaPrecos = resultadosPrecos.reduce((total, row) => total + parseFloat(row.preco_kwh), 0);
                const mediaPrecos = somaPrecos / resultadosPrecos.length;

                // Buscar taxa estadual
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
                    const precoFinalKwh = parseFloat((mediaPrecos * (1 + taxa / 100)).toFixed(4));

                    // Inserir contrato do cliente
                    const sqlContratoCliente = `
                        INSERT INTO contratos_clientes 
                        (usuario_id, data_inicio, estado_cliente, consumo_medio_kwh, preco_final_kwh, status,
                        consumo_fatura_1, consumo_fatura_2, consumo_fatura_3,
                        consumo_media_fatura, valor_fatura_1, valor_fatura_2, valor_fatura_3, media_valor_fatura, flag_cliente)
                        VALUES (?, NOW(), ?, ?, ?, 'A', ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `;
                    const paramsContrato = [
                        usuarioId, estadoCliente, consumoMedio, precoFinalKwh,
                        kwh1f, kwh2f, kwh3f, consumoMedio,
                        conta1f, conta2f, conta3f, mediaFatura
                    ];

                    db.query(sqlContratoCliente, paramsContrato, (errContrato, resultContrato) => {
                        if (errContrato) {
                            console.error("Erro ao cadastrar contrato do cliente:", errContrato);
                            return res.status(500).send("Erro ao cadastrar contrato do cliente.");
                        }

                        const contratoClienteId = resultContrato.insertId;

                        // Inserir histórico de preços para o cliente
                        const precoBaseFornecedor = parseFloat(mediaPrecos.toFixed(4)); // valor médio dos fornecedores
                        const taxaPercentual = taxa; // já em formato percentual
                        const precoFinalCliente = precoFinalKwh; // já calculado com a taxa

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

                                // Atualizar estoque
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
                    });
                });
            });
        });
    });
};

exports.salvarKwh = (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const { mes_referencia, kwh_gerado } = req.body;
    const userId = req.session.user.id;

    const sqlBuscaContrato = `
        SELECT * FROM contratos_clientes
        WHERE id_usuario = ?
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(sqlBuscaContrato, [userId], (err, resultContrato) => {
        if (err) {
            console.error('Erro ao buscar contrato:', err);
            return res.status(500).send('Erro ao buscar contrato.');
        }

        if (resultContrato.length === 0) {
            return res.status(404).send('Contrato não encontrado.');
        }

        const contrato = resultContrato[0];
        const idContrato = contrato.id;
        const estado = contrato.estado;
        const precoFinalKwh = parseFloat(contrato.preco_final_kwh);
        const mediaValorFatura = parseFloat(contrato.media_valor_fatura);
        const consumoAntigo = parseFloat(contrato.consumo_medio_kwh);
        const consumoNovo = parseFloat(kwh_gerado);

        // 1. Inserir valor médio da fatura no histórico
        const sqlClonarHistorico = `
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
                ?, ?, ?, taxa_percentual, preco_final_cliente, CURDATE(), NULL, contrato_cliente_id
            FROM historico_precos
            WHERE contrato_cliente_id = ?
                AND data_fim IS NULL
            ORDER BY id DESC
            LIMIT 1
        `;

        db.query(sqlClonarHistorico, [userId, estado, mediaValorFatura, idContrato], (err1) => {
            if (err1) {
                console.error('Erro ao clonar histórico de preços:', err1);
                return res.status(500).send('Erro ao registrar histórico.');
            }

            // 2. Adicionar consumo antigo ao estoque
            const sqlAddEstoque = `
                UPDATE estoque_kwh_estado
                SET quantidade_kwh = quantidade_kwh + ?
                WHERE estado = ?
            `;
            db.query(sqlAddEstoque, [consumoAntigo, estado], (err2) => {
                if (err2) {
                    console.error('Erro ao atualizar estoque (adição):', err2);
                    return res.status(500).send('Erro ao ajustar estoque antigo.');
                }

                // 3. Atualizar novo consumo no contrato
                const sqlAtualizaConsumo = `
                    UPDATE contratos_clientes
                    SET consumo_medio_kwh = ?
                    WHERE id = ?
                `;
                db.query(sqlAtualizaConsumo, [consumoNovo, idContrato], (err3) => {
                    if (err3) {
                        console.error('Erro ao atualizar consumo:', err3);
                        return res.status(500).send('Erro ao atualizar contrato.');
                    }

                    // 4. Deduzir novo consumo do estoque
                    const sqlDeduzEstoque = `
                        UPDATE estoque_kwh_estado
                        SET quantidade_kwh = quantidade_kwh - ?
                        WHERE estado = ?
                    `;
                    db.query(sqlDeduzEstoque, [consumoNovo, estado], (err4) => {
                        if (err4) {
                            console.error('Erro ao deduzir estoque:', err4);
                            return res.status(500).send('Erro ao ajustar estoque novo.');
                        }

                        // 5. Calcular novo valor médio da fatura e atualizar no contrato
                        const novoValorFatura = precoFinalKwh * consumoNovo;
                        const sqlAtualizaFatura = `
                            UPDATE contratos_clientes
                            SET media_valor_fatura = ?
                            WHERE id = ?
                        `;
                        db.query(sqlAtualizaFatura, [novoValorFatura, idContrato], (err5) => {
                            if (err5) {
                                console.error('Erro ao atualizar valor da fatura:', err5);
                                return res.status(500).send('Erro ao atualizar fatura.');
                            }

                            // ✅ Tudo feito: redirecionar para home do consumidor
                            res.redirect('/home_consumidor?refresh=1');
                        });
                    });
                });
            });
        });
    });
};
exports.salvarKwh = (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const { mes_referencia, kwh_gerado } = req.body;
    const userId = req.session.user.id;

    const sqlBuscaContrato = `
        SELECT * FROM contratos_clientes
        WHERE id_usuario = ?
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(sqlBuscaContrato, [userId], (err, resultContrato) => {
        if (err) {
            console.error('Erro ao buscar contrato:', err);
            return res.status(500).send('Erro ao buscar contrato.');
        }

        if (resultContrato.length === 0) {
            return res.status(404).send('Contrato não encontrado.');
        }

        const contrato = resultContrato[0];
        const idContrato = contrato.id;
        const estado = contrato.estado;
        const precoFinalKwh = parseFloat(contrato.preco_final_kwh);
        const mediaValorFatura = parseFloat(contrato.media_valor_fatura);
        const consumoAntigo = parseFloat(contrato.consumo_medio_kwh);
        const consumoNovo = parseFloat(kwh_gerado);

        // 1. Inserir valor médio da fatura no histórico
        const sqlClonarHistorico = `
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
                ?, ?, ?, taxa_percentual, preco_final_cliente, CURDATE(), NULL, contrato_cliente_id
            FROM historico_precos
            WHERE contrato_cliente_id = ?
                AND data_fim IS NULL
            ORDER BY id DESC
            LIMIT 1
        `;

        db.query(sqlClonarHistorico, [userId, estado, mediaValorFatura, idContrato], (err1) => {
            if (err1) {
                console.error('Erro ao clonar histórico de preços:', err1);
                return res.status(500).send('Erro ao registrar histórico.');
            }

            // 2. Adicionar consumo antigo ao estoque
            const sqlAddEstoque = `
                UPDATE estoque_kwh_estado
                SET quantidade_kwh = quantidade_kwh + ?
                WHERE estado = ?
            `;
            db.query(sqlAddEstoque, [consumoAntigo, estado], (err2) => {
                if (err2) {
                    console.error('Erro ao atualizar estoque (adição):', err2);
                    return res.status(500).send('Erro ao ajustar estoque antigo.');
                }

                // 3. Atualizar novo consumo no contrato
                const sqlAtualizaConsumo = `
                    UPDATE contratos_clientes
                    SET consumo_medio_kwh = ?
                    WHERE id = ?
                `;
                db.query(sqlAtualizaConsumo, [consumoNovo, idContrato], (err3) => {
                    if (err3) {
                        console.error('Erro ao atualizar consumo:', err3);
                        return res.status(500).send('Erro ao atualizar contrato.');
                    }

                    // 4. Deduzir novo consumo do estoque
                    const sqlDeduzEstoque = `
                        UPDATE estoque_kwh_estado
                        SET quantidade_kwh = quantidade_kwh - ?
                        WHERE estado = ?
                    `;
                    db.query(sqlDeduzEstoque, [consumoNovo, estado], (err4) => {
                        if (err4) {
                            console.error('Erro ao deduzir estoque:', err4);
                            return res.status(500).send('Erro ao ajustar estoque novo.');
                        }

                        // 5. Calcular novo valor médio da fatura e atualizar no contrato
                        const novoValorFatura = precoFinalKwh * consumoNovo;
                        const sqlAtualizaFatura = `
                            UPDATE contratos_clientes
                            SET media_valor_fatura = ?
                            WHERE id = ?
                        `;
                        db.query(sqlAtualizaFatura, [novoValorFatura, idContrato], (err5) => {
                            if (err5) {
                                console.error('Erro ao atualizar valor da fatura:', err5);
                                return res.status(500).send('Erro ao atualizar fatura.');
                            }

                            // ✅ Tudo feito: redirecionar para home do consumidor
                            res.redirect('/home_consumidor?refresh=1');
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

exports.processaSimulacao = (req, res) => {
    const { preco_kwh_sim, geracao_kwh_sim, prazo_contrato_sim, estado_fazenda_sim } = req.body;

    const taxaSQL = `
        SELECT taxa FROM taxa_estaduais WHERE estado = ? LIMIT 1;
    `;

    db.query(taxaSQL, [estado_fazenda_sim], (err, resultadosTaxa) => {
        if (err) return res.status(500).send('Erro interno no servidor.');
        if (resultadosTaxa.length === 0) return res.status(400).send('Estado não encontrado.');

        const taxaEstadual = resultadosTaxa[0].taxa / 100;
        const precoComTaxa = preco_kwh_sim * (1 + taxaEstadual);
        const valorBase = precoComTaxa * geracao_kwh_sim;

        let taxaMensal = 0;
        switch (parseInt(prazo_contrato_sim)) {
            case 3: taxaMensal = 0.075; break;
            case 6: taxaMensal = 0.05; break;
            case 12: taxaMensal = 0.025; break;
        }

        const valorMensalComTaxa = valorBase * (1 + taxaMensal);
        const resultado_calculado = valorMensalComTaxa.toFixed(2);

        if (req.session.usuario) {
            req.session.usuario.resultado_calculado = resultado_calculado;
        }

        res.render('home_fornecedor', { resultado_calculado });
    });
};

exports.rescindirContrato = (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const usuario_id = req.session.usuario.id;
    const dataRescisao = new Date();

    const sqlUpdate = `
        UPDATE contratos_fornecedores
        SET 
            data_rescisao = ?, 
            status = 'RE',
            flag_fornecedor = NULL
        WHERE usuario_id = ? AND status = 'AT'
    `;

    db.query(sqlUpdate, [dataRescisao, usuario_id], (err, result) => {
        if (err) return res.status(500).send('Erro ao rescindir contrato.');
        if (result.affectedRows === 0) return res.status(404).send('Nenhum contrato ativo encontrado para rescindir.');
        flagRescisao = 1;
        res.redirect('/index');
    });
};

function formatarData(data) {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

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

function formatarData(data) {
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}
