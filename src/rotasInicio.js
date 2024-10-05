const express = require('express');
const router = express.Router();
const db = require('./db');

//renderizar pagina inicial: OK!
router.get('/', (req, res) => {
    db.all("SELECT nome, slug, imagens FROM jogo", [], (err, rows) => {
        if (err) {
            throw err;
        }
        
        // Mapeia os resultados para incluir apenas os campos desejados
        const jogos = rows.map(row => ({
            nome: row.nome,
            slug: row.slug,
            imagens: JSON.parse(row.imagens) // Supondo que as imagens estejam em formato JSON
        }));

        res.render('index', { jogos });
    });
});

//carregar um jogo: OK!
router.get('/jogos/:slug', (req, res) => {
    const slug = req.params.slug;

    // Buscar o jogo no banco de dados
    db.get('SELECT * FROM jogo WHERE slug = ?', [slug], (err, jogo) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao buscar o jogo');
        }

        if (!jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        // Renderizar o template EJS com os dados do jogo
        res.render('template', {
            jogo: {
                nome: jogo.nome,
                ano: jogo.ano,
                plataformas: JSON.parse(jogo.plataformas),
                categorias: JSON.parse(jogo.categorias),
                desenvolvedores: JSON.parse(jogo.desenvolvedores),
                descricao: jogo.descricao,
                links: JSON.parse(jogo.links),
                imagens: JSON.parse(jogo.imagens),
                slug: jogo.slug
            }
        });
    });
});

router.get('/sobre', (req, res) => {
    res.render('sobre');
});


module.exports = router;
