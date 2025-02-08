const express = require('express'); //importa o módulo Express
const router = express.Router(); //cria um objeto Router do Express, que permite definir rotas
require('dotenv').config(); //importa o módulo dotenv que contém as credenciais

//rota para renderizar a página de login
router.get('/login', (req, res) => {
    res.render('admin/login');
});

//rota para processar o login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    //verifica as credenciais
    if (username === process.env.DB_USER && password === process.env.DB_PASSWORD) {
        req.session.loggedIn = true;
        return res.redirect(`/admin?page=1&limit=20`)
    } else {
        return res.redirect('/login');
    }
});

//middleware para verificar se o usuário está logado
function usuarioAutenticado(req, res, next) {
    if (req.session.loggedIn) {
        return next();
    } else {
        res.redirect('/login');
    }
}

//exporta as rotas e o middleware
module.exports = {
    router,
    usuarioAutenticado
};