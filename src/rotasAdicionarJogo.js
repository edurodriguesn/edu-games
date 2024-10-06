const express = require('express');
const router = express.Router();
const db = require('./db'); 
<<<<<<< HEAD
const slugify = require('slugify');
const { usuarioAutenticado } = require('./rotasLogin');
const upload = require('./upload');

// rota para renderizar a página de criação de novo jogo:
router.get('/admin/jogos/adicionar', usuarioAutenticado, (req, res) => {
=======
const fs = require('fs');
const slugify = require('slugify');
const ejs = require('ejs');
const { isAuthenticated } = require('./rotasLogin');
const upload = require('./upload');

// Rota para renderizar a página de criação de novo jogo: OK!

router.get('/admin/jogos/adicionar', isAuthenticated, (req, res) => {
>>>>>>> 6af0580dbd8d8a91935991d813e4ac762bd0fdbd
    db.all("SELECT nome FROM plataforma", (err, plataformas) => {
        if (err) {
            return res.status(500).send('Erro ao carregar as plataformas');
        }
        db.all("SELECT nome FROM categoria", (err, categorias) => {
            if (err) {
                return res.status(500).send('Erro ao carregar as categorias');
            }
            db.all("SELECT nome FROM desenvolvedor", (err, desenvolvedores) => {
                if (err) {
                    return res.status(500).send('Erro ao carregar os desenvolvedores');
                }
                res.render('adicionar-jogo', { plataformas, categorias, desenvolvedores });
            });
        });
    });
<<<<<<< HEAD
}); 

//rota para adicionar jogo
router.post('/admin/jogos/adicionar', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), (req, res) => {
    try {
        const { nome, ano, plataforma, categoria, desenvolvedor, descricao, linkTitle, linkURL } = req.body;

        //verifica se as plataformas, categorias e desenvolvedores são arrays ou strings únicas
=======
});

// Rota para adicionar jogo
router.post('/adicionarjogo', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), (req, res) => {
    try {
        const { nome, ano, plataforma, categoria, desenvolvedor, descricao, linkTitle, linkURL } = req.body;

        // Verifica se as plataformas, categorias e desenvolvedores são arrays ou strings únicas
>>>>>>> 6af0580dbd8d8a91935991d813e4ac762bd0fdbd
        const plataformas = Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean);
        const categorias = Array.isArray(categoria) ? categoria : [categoria].filter(Boolean);
        const desenvolvedores = Array.isArray(desenvolvedor) ? desenvolvedor : [desenvolvedor].filter(Boolean);

<<<<<<< HEAD
        //links externos
=======
        // Links externos
>>>>>>> 6af0580dbd8d8a91935991d813e4ac762bd0fdbd
        const linksExternos = Array.isArray(linkTitle) && Array.isArray(linkURL)
            ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }))
            : linkTitle && linkURL
                ? [{ title: linkTitle, url: linkURL }]
                : [];

        const slug = slugify(nome, { lower: true });

<<<<<<< HEAD
        //processar imagem de capa
        let capaBase64 = null;
        if (req.files.imagemCapa) {
            const capaBuffer = req.files.imagemCapa[0].buffer;  //pega o buffer da imagem da memória
            capaBase64 = capaBuffer.toString('base64');  //converte para base64
        }

        //processar demais imagens
        const imagensBase64 = req.files.imagens
            ? req.files.imagens.map(file => {
                const imageBuffer = file.buffer;  //pega o buffer da imagem da memória
                return imageBuffer.toString('base64');  //converte para base64
            })
            : [];

        //a imagem de capa fica no índice 0
        imagensBase64.unshift(capaBase64);

        //obter a data e hora atual para data_criacao e data_modificacao
        const dataAtual = new Date().toISOString();

        //salvar as informações no banco de dados
=======
        // Processar imagem de capa
        let capaBase64 = null;
        if (req.files.imagemCapa) {
            const capaBuffer = req.files.imagemCapa[0].buffer;  // Pega o buffer da imagem da memória
            capaBase64 = capaBuffer.toString('base64');  // Converte para base64
        }

        // Processar demais imagens
        const imagensBase64 = req.files.imagens
            ? req.files.imagens.map(file => {
                const imageBuffer = file.buffer;  // Pega o buffer da imagem da memória
                return imageBuffer.toString('base64');  // Converte para base64
            })
            : [];

        // A imagem de capa fica no índice 0
        imagensBase64.unshift(capaBase64);

        // Obter a data e hora atual para data_criacao e data_modificacao
        const dataAtual = new Date().toISOString();

        // Salvar as informações no banco de dados
>>>>>>> 6af0580dbd8d8a91935991d813e4ac762bd0fdbd
        db.run(
            `INSERT INTO jogo (nome, ano, plataformas, categorias, desenvolvedores, descricao, links, imagens, slug, data_criacao, data_modificacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                ano,
                JSON.stringify(plataformas),
                JSON.stringify(categorias),
                JSON.stringify(desenvolvedores),
                descricao,
                JSON.stringify(linksExternos),
<<<<<<< HEAD
                JSON.stringify(imagensBase64),  //agora as imagens incluem a capa no índice 0
=======
                JSON.stringify(imagensBase64),  // Agora as imagens incluem a capa no índice 0
>>>>>>> 6af0580dbd8d8a91935991d813e4ac762bd0fdbd
                slug,
                dataAtual,
                dataAtual
            ],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Erro ao salvar o jogo no banco de dados' });
                }
<<<<<<< HEAD
                res.redirect('/admin'); //redirecionar para a página de administração
=======
                res.redirect('/admin'); // Redirecionar para a página de administração
>>>>>>> 6af0580dbd8d8a91935991d813e4ac762bd0fdbd
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar o jogo' });
    }
});

module.exports = router;