const express = require('express');
const router = express.Router();
const db = require('./db');

//renderizar pagina inicial: OK!
router.get('/', (req, res) => {
    db.all("SELECT nome, slug, imagens FROM jogo", [], (err, rows) => {
        if (err) {
            throw err;
        }
        
        //mapeia os resultados para incluir apenas os campos desejados
        const jogos = rows.map(row => ({
            nome: row.nome,
            slug: row.slug,
            imagens: JSON.parse(row.imagens) //supondo que as imagens estejam em formato JSON
        }));

        res.render('index', { jogos });
    });
});

router.get('/sobre', (req, res) => {
    res.render('sobre');
});


//carregar um jogo: OK!
router.get('/jogos/:slug', (req, res) => {
    const slug = req.params.slug;

    //buscar o jogo no banco de dados
    db.get('SELECT * FROM jogo WHERE slug = ?', [slug], (err, jogo) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao buscar o jogo');
        }

        if (!jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        //renderizar o template EJS com os dados do jogo
        res.render('template', {
            jogo: {
                nome: jogo.nome,
                ano: jogo.ano,
                plataformas: JSON.parse(jogo.plataforma),
                categorias: JSON.parse(jogo.categoria),
                desenvolvedores: JSON.parse(jogo.desenvolvedor),
                descricao: jogo.descricao,
                links: JSON.parse(jogo.links),
                imagens: JSON.parse(jogo.imagens),
                slug: jogo.slug
            }
        });
    });
});
router.get('/filtrar/:caracteristica', (req, res) => {
    const tipoCaracteristica = req.params.caracteristica;
    const tipoCapitalizado = tipoCaracteristica.charAt(0).toUpperCase() + tipoCaracteristica.slice(1);
    db.all("SELECT * FROM caracteristica WHERE tipo = ?", [tipoCaracteristica], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar características:', err);
            return res.status(500).send('Erro ao buscar as características');
        }

        if (rows.length === 0) {
            console.warn('Nenhuma característica encontrada para:', tipoCaracteristica);
            return res.status(404).send('Nenhuma característica encontrada');
        }

        res.render('filtrar', { caracteristicas: rows, tipoCaracteristica: tipoCapitalizado});
    });
});

router.get('/filtrar/:caracteristica/:slug', (req, res) => {
    const tipoCaracteristica = req.params.caracteristica;
    db.get("SELECT nome FROM caracteristica WHERE slug = ?", [req.params.slug], (err, row) => {
        if (err) {
            console.error("Erro ao buscar característica:", err);
            return res.status(500).send("Erro ao buscar característica");
        }
        
        // Caso não encontre o nome da característica, retornamos erro 404
        if (!row) {
            return res.status(404).send("Nenhuma característica encontrada");
        }
        
        // Agora que temos o nome da característica, montamos a consulta para buscar os jogos
        const nomeCaracteristica = row.nome;
        const query = `SELECT * FROM jogo WHERE ${tipoCaracteristica} LIKE ?`;
        const valor = `%${nomeCaracteristica}%`;

        // Buscamos os jogos que correspondem à característica
        db.all(query, [valor], (err, rows) => {
            if (err) {
                return res.status(500).send('Erro ao buscar os jogos');
            }

            // Se não encontrar jogos, retornamos erro 404
            if (rows.length === 0) {
                return res.status(404).send('Nenhum jogo encontrado');
            }

            // Mapear os jogos e processar as imagens
            const jogos = rows.map(row => ({
                nome: row.nome,
                slug: row.slug,
                imagens: row.imagens ? JSON.parse(row.imagens) : [] // Verifique se imagens existe antes de parsear
            }));

            // Renderizar a página com os jogos filtrados
            res.render('jogos-filtrados', {jogos, tipoCaracteristica, nomeCaracteristica});
        });
    });
});




module.exports = router;
