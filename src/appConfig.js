const express = require('express');
const session = require('express-session');
const path = require('path');

require('dotenv').config();

const appConfig = (app) => {
    //middleware para processar o corpo da requisição
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    //configuração de sessão
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    }));

    //configuração para EJS
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views')); //ajuste o caminho para as views

    //middleware para servir arquivos estáticos
    app.use(express.static(path.join(__dirname, '../public'))); //ajuste o caminho para a pasta pública
};

module.exports = appConfig;
