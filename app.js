const express = require('express');
const path = require('path');

//importacao das rotas
const rotasInicio = require('./src/rotasInicio');
const rotasLogin = require('./src/rotasLogin').router;
const rotasAdmin = require('./src/rotasAdmin');
const rotasAdicionarJogo = require('./src/rotasAdicionarJogo');
const rotasEditarJogo = require('./src/rotasEditarJogo');

const appConfig = require('./src/appConfig'); // Importa a configuração do app
const app = express();//inicializa o express

appConfig(app);

const db = require('./src/db'); //importada a confuguração do banco de dados

app.use(express.static(path.join(__dirname, '/'))); //middleware para servir arquivos estáticos

//disponibilizacao das rotas
app.use(rotasInicio);
app.use(rotasLogin);
app.use(rotasAdmin);
app.use(rotasAdicionarJogo);
app.use(rotasEditarJogo);


// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});