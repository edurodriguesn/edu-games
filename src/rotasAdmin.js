const express = require('express'); //importa o módulo Express
const router = express.Router(); //cria um objeto Router do Express, que permite definir rotas
const pool = require('./db'); //importa o módulo db (banco de dados)
const slugify = require('slugify');
const { usuarioAutenticado } = require('./rotasLogin'); //middleware de autenticação

router.get('/admin', usuarioAutenticado, async (req, res) => {
    const sortField = req.query.sort === 'data_modificacao' ? 'data_modificacao' : 'data_criacao';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
        // Buscar jogos com paginação
        const result = await pool.query(
            `SELECT id, nome, data_criacao, data_modificacao, slug 
             FROM jogo 
             ORDER BY ${sortField} DESC 
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        // Contar total de jogos para calcular o número de páginas
        const totalResult = await pool.query("SELECT COUNT(*) as total FROM jogo");
        const total = parseInt(totalResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        res.render('admin/admin', { jogos: result.rows, sort: sortField, page, totalPages, total, limit });
    } catch (err) {
        return res.status(500).send('Erro ao carregar os jogos');
    }
});


//rota para excluir um jogo
router.post('/admin/jogos/:id/delete', usuarioAutenticado, async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar se o jogo existe
        const jogoResult = await pool.query('SELECT * FROM jogo WHERE id = $1', [id]);
        const jogo = jogoResult.rows[0];

        if (!jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        // Excluir o jogo do banco de dados
        await pool.query('DELETE FROM jogo WHERE id = $1', [id]);

        // Redirecionar para a página de administração
        res.redirect('/admin');
    } catch (err) {
        console.error('Erro ao excluir o jogo:', err);
        return res.status(500).send('Erro ao excluir o jogo');
    }
});

router.post('/add-option', async (req, res) => {
    const { tipo, nome } = req.body;

    let tableName;
    switch (tipo) {
        case 'plataforma':
            tableName = 'plataforma';
            break;
        case 'categoria':
            tableName = 'categoria';
            break;
        case 'conhecimento':
            tableName = 'conhecimento';
            break;
        case 'idioma':
            tableName = 'idioma';
            break;
        default:
            return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    const slug = slugify(nome, { lower: true });

    try {
        // Verifica se a opção já existe antes de adicionar
        const checkQuery = 'SELECT * FROM caracteristica WHERE tipo = $1 AND nome = $2';
        const checkResult = await pool.query(checkQuery, [tableName, nome]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'A opção já existe' });
        }

        // Adiciona a nova opção se não existir
        const insertQuery = 'INSERT INTO caracteristica (tipo, nome, slug) VALUES ($1, $2, $3)';
        await pool.query(insertQuery, [tableName, nome, slug]);

        res.status(200).json({ success: true, message: 'Opção adicionada com sucesso' });
    } catch (err) {
        console.error('Erro ao adicionar a nova opção:', err.message);
        return res.status(500).json({ success: false, message: 'Erro ao adicionar a nova opção' });
    }
});

// Rota para exibir a página de características
router.get('/admin/caracteristicas', usuarioAutenticado, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, nome, tipo FROM caracteristica ORDER BY tipo, nome");
        const caracteristicas = result.rows;

        res.render('admin/caracteristicas', { caracteristicas });
    } catch (err) {
        res.status(500).send('Erro ao carregar características');
    }
});

// Rota para salvar alterações nas características
router.post('/admin/caracteristicas/salvar', usuarioAutenticado, async (req, res) => {
    const { id, nome, tipo, acao } = req.body;

    try {
        if (acao === 'adicionar') {
            await pool.query("INSERT INTO caracteristica (nome, tipo) VALUES ($1, $2)", [nome, tipo]);
        } else if (acao === 'editar') {
            await pool.query("UPDATE caracteristica SET nome = $1, tipo = $2 WHERE id = $3", [nome, tipo, id]);
        } else if (acao === 'excluir') {
            await pool.query("DELETE FROM caracteristica WHERE id = $1", [id]);
        }
        res.redirect('/admin/caracteristicas');
    } catch (err) {
        res.status(500).send('Erro ao processar a requisição');
    }
});

module.exports = router;