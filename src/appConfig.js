// src/appConfig.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const appConfig = (app) => {
    // Middleware para processar o corpo da requisição
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Configuração de sessão
    app.use(session({
        secret: 'secreto123',
        resave: false,
        saveUninitialized: true,
    }));

    // Configuração para EJS
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views')); // Ajuste o caminho para as views

    // Middleware para servir arquivos estáticos
    app.use(express.static(path.join(__dirname, '../public'))); // Ajuste o caminho para a pasta pública
};

module.exports = appConfig;
