const express = require('express'); //importa o módulo Express
const router = express.Router(); //cria um objeto Router do Express, que permite definir rotas
const db = require('./db'); //importa o módulo db (banco de dados)
const { isAuthenticated } = require('./rotasLogin'); // Middleware de autenticação

router.get('/admin', isAuthenticated, (req, res) => {
    const sortField = req.query.sort === 'data_modificacao' ? 'data_modificacao' : 'data_criacao'; // Ordenar por data de criação como padrão

    const query = `SELECT id, nome, data_criacao, data_modificacao,slug FROM jogo ORDER BY ${sortField} DESC`;

    db.all(query, (err, jogos) => {
        if (err) {
            return res.status(500).send('Erro ao carregar os jogos');
        }

        res.render('admin', { jogos, sort: sortField });
    });
});

// Rota para excluir um jogo
router.post('/admin/jogos/:id/delete', isAuthenticated, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM jogo WHERE id = ?", [id], (err, jogo) => {
        if (err) {
            return res.status(500).send('Erro ao carregar o jogo');
        }

        // Verificar se o jogo foi encontrado
        if (!jogo) {
            return res.status(404).send('jogo não encontrado');
        }

        // Excluir o jogo do banco de dados
        db.run("DELETE FROM jogo WHERE id = ?", [id], (err) => {
            if (err) {
                return res.status(500).send('Erro ao excluir o jogo');
            }

            // Redirecionar para a página de administração
            res.redirect('/admin');
        });
    });
});
// Rota para adicionar uma nova opção (plataforma, categoria ou desenvolvedor): OK!
router.post('/add-option', (req, res) => {
    const { tipo, nome } = req.body;

    let tableName;
    switch (tipo) {
        case 'plataforma':
            tableName = 'plataforma';
            break;
        case 'categoria':
            tableName = 'categoria';
            break;
        case 'desenvolvedor':
            tableName = 'desenvolvedor';
            break;
        default:
            return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    // Verifica se a opção já existe antes de adicionar
    db.get(`SELECT * FROM ${tableName} WHERE nome = ?`, [nome], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao verificar a opção existente' });
        }

        if (row) {
            return res.status(400).json({ success: false, message: 'A opção já existe' });
        }

        // Adiciona a nova opção se não existir
        db.run(`INSERT INTO ${tableName} (nome) VALUES (?)`, [nome], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erro ao adicionar a nova opção' });
            }
            res.status(200).json({ success: true, message: 'Opção adicionada com sucesso' });
        });
    });
});

module.exports = router;