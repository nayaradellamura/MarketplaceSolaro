const db = require('../db/db');

const contratoController = {
    cadastrarContrato: (dados, callback) => {
        const { preco_kwh, geracao_kwh, estado_fazenda, prazo_contrato, UsuarioID } = dados;

        let meses = 0;
        if (prazo_contrato === "3_meses") meses = 3;
        else if (prazo_contrato === "6_meses") meses = 6;
        else if (prazo_contrato === "12_meses") meses = 12;
        else return callback(new Error("Prazo de contrato inválido"));

        const sql = `
            INSERT INTO contrato (
                UsuarioID,
                dataAssinatura,
                dataFinal,
                prazoContrato,
                estado_fazenda,
                preco_kwh,
                geracao_kwh
            ) VALUES (?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [UsuarioID, meses, prazo_contrato, estado_fazenda, preco_kwh, geracao_kwh],
            (err, result) => {
                callback(err);
            }
        );
    }
};


module.exports = contratoController;
