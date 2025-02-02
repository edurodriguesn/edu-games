const express = require('express');
const path = require('path');

//importacao das rotas
const rotasInicio = require('./src/rotasInicio');
const rotasLogin = require('./src/rotasLogin').router;
const rotasAdmin = require('./src/rotasAdmin');
const rotasAdicionarJogo = require('./src/rotasAdicionarJogo');
const rotasEditarJogo = require('./src/rotasEditarJogo');

const appConfig = require('./src/appConfig'); //importa a configuração do app
const app = express();//inicializa o express

appConfig(app);

app.use(express.static(path.join(__dirname, '/'))); //middleware para servir arquivos estáticos

//disponibilizacao das rotas
app.use(rotasInicio);
app.use(rotasLogin);
app.use(rotasAdmin);
app.use(rotasAdicionarJogo);
app.use(rotasEditarJogo);

// Middleware para capturar rotas não definidas (404)
app.use((req, res) => {
    res.status(404).render('erro', { mensagem: 'Página não encontrada' , statusCode: 404});
});

//inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});