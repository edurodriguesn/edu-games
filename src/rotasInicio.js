const express = require('express');
const router = express.Router();
const pool = require('./db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT nome, slug, imagens FROM jogo ORDER BY id DESC LIMIT 6"
        );
        // renderiza a página com os dados dos jogos
        res.render('index', { jogos: result.rows });
    } catch (err) {
        console.error('Erro ao buscar os jogos:', err.message);
        res.status(500).send('Erro no servidor.');
    }
});


module.exports = router;


router.get('/todos-jogos', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const offset = (page - 1) * limit;

    try {
        const jogosResult = await pool.query(
            "SELECT nome, slug, imagens FROM jogo LIMIT $1 OFFSET $2",
            [limit, offset]
        );

        const totalResult = await pool.query("SELECT COUNT(*) as total FROM jogo");
        const total = parseInt(totalResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        res.render('todos-jogos', { jogos: jogosResult.rows, page, totalPages });
    } catch (err) {
        console.error('Erro ao buscar os jogos:', err.message);
        res.status(500).send('Erro no servidor.');
    }
});


router.get('/sobre', (req, res) => {
    res.render('sobre');
});

//carregar um jogo
router.get('/jogos/:slug', async (req, res) => {
    const slug = req.params.slug;

    try {
        // Buscar o jogo pelo slug
        const jogoResult = await pool.query('SELECT * FROM jogo WHERE slug = $1', [slug]);
        const jogo = jogoResult.rows[0];

        if (!jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        // garante a manipulação correta dos campos JSON
        const conhecimento = jogo.conhecimento ? jogo.conhecimento[0] : null;

        // buscar jogos relacionados com base no primeiro conhecimento, se houver
        const relatedResult = await pool.query(
            `SELECT nome, slug, imagens FROM jogo 
             WHERE EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(conhecimento) AS elem 
                WHERE elem ILIKE $1
              ) AND slug != $2 
             LIMIT 3`,
            [`%${conhecimento}%`, slug]
        );

        // renderiza a página com os dados do jogo e jogos relacionados
        res.render('template', {
            jogo: {
                nome: jogo.nome,
                ano: jogo.ano,
                plataformas: jogo.plataforma || [],
                categorias: jogo.categoria || [],
                conhecimentos: jogo.conhecimento || [],
                idiomas: jogo.idioma || [],
                descricao: jogo.descricao,
                links: jogo.links || [],
                imagens: jogo.imagens || [],
                slug: jogo.slug
            },
            jogosRelacionados: relatedResult.rows
        });
    } catch (err) {
        console.error('Erro ao buscar os dados do jogo:', err.message);
        res.status(500).send('Erro ao buscar o jogo');
    }
});

router.get('/filtrar/:caracteristica', async(req, res) => {
    //pega o tipo da caracteristica presente na url
    const tipoCaracteristica = req.params.caracteristica;
    
    //transforma a primeira letra da string em maiuscula
    const tipoCapitalizado = tipoCaracteristica.charAt(0).toUpperCase() + tipoCaracteristica.slice(1);
    try {
        result = await pool.query(
            "SELECT * FROM caracteristica WHERE tipo = $1",
            [tipoCaracteristica]
        );
        const caracteristicas = result.rows;
        if (caracteristicas.length === 0) {
            return res.status(404).send('Nenhuma característica encontrada');
        } //apenas para evitar erros caso o banco de dados esteja vazio

        res.render('filtrar', { caracteristicas, tipoCaracteristica: tipoCapitalizado});
    } catch (err) {
        return res.status(500).send('Erro ao buscar as características');
    }
});

router.get('/filtrar/:caracteristica/:slug', async (req, res) => {
    const tipoCaracteristica = req.params.caracteristica;
    
    const page = parseInt(req.query.page) || 1; // Página atual (padrão: 1)
    const limit = parseInt(req.query.limit) || 9; // Limite de itens por página (padrão: 9)
    const offset = (page - 1) * limit; // Calcula o deslocamento
    
    try {
        // consulta para buscar o nome da característica
        const result = await pool.query("SELECT nome FROM caracteristica WHERE slug = $1", [req.params.slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).send("Nenhuma característica encontrada");
        }

        const nomeCaracteristica = result.rows[0].nome;
        
        // prepara a consulta com base no tipo de característica e filtra os jogos
        const query = `
            SELECT nome, slug, imagens FROM jogo
            WHERE ${tipoCaracteristica} @> $1::jsonb
            LIMIT $2 OFFSET $3`; // verifica se o valor está contido no campo jsonb
        const queryResult = await pool.query(query, [JSON.stringify([nomeCaracteristica]), limit, offset]); // Passa o valor como array

        const totalResult = await pool.query("SELECT COUNT(*) as total FROM jogo");
        const total = parseInt(totalResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        res.render('jogos-filtrados', {
            jogos: queryResult.rows,
            tipoCaracteristica,
            nomeCaracteristica,
            page,
            totalPages
        });
    } catch (err) {
        console.error("Erro ao buscar jogos filtrados:", err);
        return res.status(500).send('Erro ao buscar os jogos filtrados');
    }
});

router.get('/pesquisa', async (req, res) => {
    const termoPesquisa = req.query.pesquisa;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const offset = (page - 1) * limit;

    if (!termoPesquisa || termoPesquisa.trim() === '') {
        return res.render('resultados-pesquisa', {
            jogos: [],
            termoPesquisa: '',
            mensagem: 'Por favor, insira um termo de pesquisa.',
            page: 1,
            totalPages: 1
        });
    }

    // Ajuste para melhorar a busca, como capitalização
    const termoFormatado = `%${termoPesquisa.trim()}%`;

    // Consulta para buscar jogos com base no termo de pesquisa
    const query = `
        SELECT nome, slug, imagens FROM jogo 
        WHERE 
            LOWER(nome) LIKE LOWER($1) OR 
            LOWER(descricao) LIKE LOWER($1) OR 
            categoria @> to_jsonb($1) OR 
            conhecimento @> to_jsonb($1)
        LIMIT $2 OFFSET $3
        `;

    try {
        const result = await pool.query(query, [termoFormatado, limit, offset]);

        if (result.rows.length === 0) {
            return res.render('resultados-pesquisa', {
                jogos: [],
                termoPesquisa,
                mensagem: 'Nenhum resultado encontrado para sua pesquisa.',
                page,
                totalPages: 1
            });
        }

        const totalResult = await pool.query("SELECT COUNT(*) as total FROM jogo");
        const total = parseInt(totalResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        // renderiza os resultados
        res.render('resultados-pesquisa', {
            jogos: result.rows,
            termoPesquisa,
            mensagem: null,
            page,
            totalPages
        });
    } catch (err) {
        console.error("Erro ao buscar jogos:", err);
        return res.status(500).send('Erro ao processar a pesquisa');
    }
});

module.exports = router;