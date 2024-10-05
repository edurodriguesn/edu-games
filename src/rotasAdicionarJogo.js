const express = require('express');
const router = express.Router();
const db = require('./db'); 
const fs = require('fs');
const slugify = require('slugify');
const ejs = require('ejs');
const { isAuthenticated } = require('./rotasLogin');
const upload = require('./upload');

// Rota para renderizar a página de criação de novo jogo: OK!

router.get('/admin/jogos/adicionar', isAuthenticated, (req, res) => {
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
});

// Rota para adicionar jogo
router.post('/adicionarjogo', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), (req, res) => {
    try {
        const { nome, ano, plataforma, categoria, desenvolvedor, descricao, linkTitle, linkURL } = req.body;

        // Verifica se as plataformas, categorias e desenvolvedores são arrays ou strings únicas
        const plataformas = Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean);
        const categorias = Array.isArray(categoria) ? categoria : [categoria].filter(Boolean);
        const desenvolvedores = Array.isArray(desenvolvedor) ? desenvolvedor : [desenvolvedor].filter(Boolean);

        // Links externos
        const linksExternos = Array.isArray(linkTitle) && Array.isArray(linkURL)
            ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }))
            : linkTitle && linkURL
                ? [{ title: linkTitle, url: linkURL }]
                : [];

        const slug = slugify(nome, { lower: true });

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
                JSON.stringify(imagensBase64),  // Agora as imagens incluem a capa no índice 0
                slug,
                dataAtual,
                dataAtual
            ],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Erro ao salvar o jogo no banco de dados' });
                }
                res.redirect('/admin'); // Redirecionar para a página de administração
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar o jogo' });
    }
});

module.exports = router;