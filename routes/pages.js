//Gente separei as rotas dentro de um arquivo, toda vez que vc criarem uma pagina, tem que criar a rodta 
// por aqui, como faz isso? '/nome da pagina' e em res.render('nome da pagina')
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
})

module.exports = router;

 router.get('/cadastro_usuario', (req, res) => { 
     res.render('cadastro_usuario');
})