const express = require('express');
const router = express.Router();
const db = require('./db');

//renderizar pagina inicial: OK!
router.get('/', (req, res) => {
    db.all("SELECT nome, slug, imagens FROM jogo ORDER BY id DESC LIMIT 6", [], (err, rows) => {
        if (err) {
            throw err;
        }
        
        //mapeia os resultados para incluir apenas os campos desejados
        const jogos = rows.map(row => ({
            nome: row.nome,
            slug: row.slug,
            imagens: JSON.parse(row.imagens)
        }));

        res.render('index', { jogos });
    });
});

router.get('/todos-jogos', (req, res) => {
    // Obtém os parâmetros de paginação com valores padrão
    const page = parseInt(req.query.page) || 1; // Página atual (padrão: 1)
    const limit = parseInt(req.query.limit) || 9; // Limite de itens por página (padrão: 9)
    const offset = (page - 1) * limit; // Calcula o deslocamento

    // Consulta SQL com LIMIT e OFFSET
    db.all("SELECT nome, slug, imagens FROM jogo LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
        if (err) {
            throw err;
        }

        // Mapeia os resultados para incluir apenas os campos desejados
        const jogos = rows.map(row => ({
            nome: row.nome,
            slug: row.slug,
            imagens: JSON.parse(row.imagens)
        }));

        // Obtém o total de jogos para calcular o número de páginas
        db.get("SELECT COUNT(*) as total FROM jogo", (err, result) => {
            if (err) {
                throw err;
            }

            const total = result.total;
            const totalPages = Math.ceil(total / limit);

            res.render('todos-jogos', { jogos, page, totalPages });
        });
    });
});



router.get('/sobre', (req, res) => {
    res.render('sobre');
});

//carregar um jogo
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

        // Parse da conhecimento e pega o primeiro elemento
        const conhecimento = JSON.parse(jogo.conhecimento)[0]; // Pega o primeiro elemento

        // Buscar jogos relacionados com base na primeira conhecimento
        db.all(
            'SELECT * FROM jogo WHERE conhecimento LIKE ? AND slug != ? LIMIT 3',
            [`%${conhecimento}%`, slug],
            (err, rows) => {
                let jogosRelacionados = [];
                if (!err && rows) {
                    jogosRelacionados = rows.map(row => ({
                        nome: row.nome,
                        slug: row.slug,
                        imagens: JSON.parse(row.imagens)
                    }));
                }
    
                // Renderizar o template EJS com os dados do jogo e os jogos relacionados
                res.render('template', {
                    jogo: {
                        nome: jogo.nome,
                        ano: jogo.ano,
                        plataformas: JSON.parse(jogo.plataforma),
                        categorias: JSON.parse(jogo.categoria),
                        conhecimentos: JSON.parse(jogo.conhecimento),
                        idiomas: JSON.parse(jogo.idioma),
                        descricao: jogo.descricao,
                        links: JSON.parse(jogo.links),
                        imagens: JSON.parse(jogo.imagens),
                        slug: jogo.slug
                    },
                    jogosRelacionados
                });
            }
        );
    });    
});


router.get('/filtrar/:caracteristica', (req, res) => {
    //pega o tipo da caracteristica presente na url
    const tipoCaracteristica = req.params.caracteristica;
    
    //transforma a primeira letra da string em maiuscula
    const tipoCapitalizado = tipoCaracteristica.charAt(0).toUpperCase() + tipoCaracteristica.slice(1);
    
    db.all("SELECT * FROM caracteristica WHERE tipo = ?", [tipoCaracteristica], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar características:', err);
            return res.status(500).send('Erro ao buscar as características');
        }

        if (rows.length === 0) {
            console.warn('Nenhuma característica encontrada para:', tipoCaracteristica);
            return res.status(404).send('Nenhuma característica encontrada');
        } //apenas para evitar erros caso o banco de dados esteja vazio

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
        
        if (!row) {
            return res.status(404).send("Nenhuma característica encontrada");
        }
        
        // Prepara a query
        const nomeCaracteristica = row.nome;
        const query = `SELECT * FROM jogo WHERE ${tipoCaracteristica} LIKE ?`;
        const valor = `%${nomeCaracteristica}%`; // % adicionado para busca em JSON

        db.all(query, [valor], (err, rows) => {
            if (err) {
                console.error("Erro ao buscar os jogos:", err);
                return res.status(500).send('Erro ao buscar os jogos');
            }

            // Separa os campos desejados ou retorna uma lista vazia se nenhum jogo foi encontrado
            const jogos = rows.map(row => ({
                nome: row.nome,
                slug: row.slug,
                imagens: JSON.parse(row.imagens)
            }));

            // Renderiza a página com os jogos filtrados (vazia ou com resultados)
            res.render('jogos-filtrados', {
                jogos,
                tipoCaracteristica,
                nomeCaracteristica
            });
        });
    });
});

router.get('/pesquisa', (req, res) => {
    const termoPesquisa = req.query.pesquisa;

    if (!termoPesquisa || termoPesquisa.trim() === '') {
        return res.render('resultados-pesquisa', {
            jogos: [],
            termoPesquisa: '',
            mensagem: 'Por favor, insira um termo de pesquisa.'
        });
    }

    // Ajuste para melhorar a busca, como capitalização
    const termoFormatado = `%${termoPesquisa.trim()}%`;

    // Consulta para buscar jogos com base no termo de pesquisa
    const query = `
        SELECT * FROM jogo 
        WHERE 
            LOWER(nome) LIKE LOWER(?) OR 
            LOWER(descricao) LIKE LOWER(?) OR 
            LOWER(categoria) LIKE LOWER(?) OR 
            LOWER(conhecimento) LIKE LOWER(?)
    `;

    db.all(query, [termoFormatado, termoFormatado, termoFormatado, termoFormatado], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar jogos:", err);
            return res.status(500).send('Erro ao processar a pesquisa');
        }

        const jogos = rows.map(row => ({
            nome: row.nome,
            slug: row.slug,
            descricao: row.descricao,
            imagens: JSON.parse(row.imagens)
        }));

        if (jogos.length === 0) {
            return res.render('resultados-pesquisa', {
                jogos: [],
                termoPesquisa,
                mensagem: 'Nenhum resultado encontrado para sua pesquisa.'
            });
        }

        // Renderiza os resultados
        res.render('resultados-pesquisa', {
            jogos,
            termoPesquisa,
            mensagem: null
        });
    });
});


module.exports = router;