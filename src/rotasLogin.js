const express = require('express'); //importa o módulo Express
const router = express.Router(); //cria um objeto Router do Express, que permite definir rotas

// Rota para renderizar a página de login
router.get('/login', (req, res) => {
    res.render('login');
});

// Rota para processar o login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'senha123') {
        req.session.loggedIn = true;
        res.redirect('/admin');
    } else {
        res.redirect('/login');
    }
});

// Middleware para verificar se o usuário está logado
function isAuthenticated(req, res, next) {
    if (req.session.loggedIn) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Exporta as rotas e o middleware
module.exports = {
    router,
    isAuthenticated
};