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
        res.status(500).send('Erro no servidor');
    }
});

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

        res.render('todos-jogos', { jogos: jogosResult.rows, total, page, totalPages, limit });
    } catch (err) {
        return res.status(500).render('erro', { mensagem: 'Erro ao carregar todos os jogos', statusCode: 500 });
    }
});


router.get('/sobre', (req, res) => {
    res.render('sobre');
});

router.get('/contato', (req, res) => {
    res.render('contato');
});

//carregar um jogo
router.get('/jogos/:slug', async (req, res) => {
    const slug = req.params.slug;

    try {
        // Buscar o jogo pelo slug
        const jogoResult = await pool.query('SELECT * FROM jogo WHERE slug = $1', [slug]);
        const jogo = jogoResult.rows[0];

        if (!jogo) {
            return res.status(404).render('erro', { mensagem: 'Jogo não encontrado', statusCode: 404 });
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
        return res.status(500).render('erro', { mensagem: 'Jogo não encontrado' });
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
            return res.status(404).render('erro', { mensagem: 'Tipo de caracerística não encontrado', statusCode: 404 });
        } //apenas para evitar erros caso o banco de dados esteja vazio

        res.render('filtrar', { caracteristicas, tipoCaracteristica: tipoCapitalizado});
    } catch (err) {
        return res.status(500).render('erro', { mensagem: 'Erro ao carregar caracerísticas', statusCode: 500 });
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
            return res.status(404).render('erro', { mensagem: 'Caracerística não encontrada em nossa base de dados', statusCode: 404 });
        }

        const nomeCaracteristica = result.rows[0].nome;
        
        // prepara a consulta com base no tipo de característica e filtra os jogos
        const condition = `WHERE ${tipoCaracteristica} @> $1::jsonb`;
        const queryResult = await pool.query("SELECT nome, slug, imagens FROM jogo " + condition + " LIMIT $2 OFFSET $3", [JSON.stringify([nomeCaracteristica]), limit, offset]); // Passa o valor como array

        const totalResult = await pool.query("SELECT COUNT(*) as total FROM jogo "+ condition, [JSON.stringify([nomeCaracteristica])]);
        const total = parseInt(totalResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        res.render('jogos-filtrados', {
            jogos: queryResult.rows,
            tipoCaracteristica,
            nomeCaracteristica,
            slugCaracteristica: req.params.slug,
            total,
            page,
            totalPages,
            limit
        });
    } catch (err) {
        return res.status(500).render('erro', { mensagem: 'Erro ao carregar caracerística', statusCode: 500 });
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
            total: 0,
            totalPages: 1
        });
    }

    // Ajuste para melhorar a busca, como capitalização
    const termoFormatado = `%${termoPesquisa.trim()}%`;

    // Consulta para buscar jogos com base no termo de pesquisa
    const condition = `
        WHERE 
            LOWER(nome) LIKE LOWER($1) OR 
            LOWER(descricao) LIKE LOWER($1) OR 
            categoria @> to_jsonb($1) OR 
            conhecimento @> to_jsonb($1)
        `;

    try {
        const result = await pool.query("SELECT nome, slug, imagens FROM jogo " + condition + "LIMIT $2 OFFSET $3", [termoFormatado, limit, offset]);

        if (result.rows.length === 0) {
            return res.render('resultados-pesquisa', {
                jogos: [],
                termoPesquisa,
                mensagem: 'Nenhum resultado encontrado para sua pesquisa.',
                page,
                total : 0,
                totalPages: 1,
                limit
            });
        }

        const totalResult = await pool.query("SELECT COUNT(*) as total FROM jogo "+ condition, [termoFormatado]);
        const total = parseInt(totalResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        // renderiza os resultados
        res.render('resultados-pesquisa', {
            jogos: result.rows,
            termoPesquisa,
            mensagem: null,
            total,
            page,
            totalPages,
            limit
        });
    } catch (err) {
        return res.status(500).render('erro', { mensagem: 'Erro ao processar a pesquisa', statusCode: 500 });
    }
});

module.exports = router;