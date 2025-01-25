const express = require('express');
const router = express.Router();
const db = require('./db'); 
const slugify = require('slugify');
const { usuarioAutenticado } = require('./rotasLogin');
const upload = require('./upload');

// rota para renderizar a página de criação de novo jogo:
router.get('/admin/jogos/adicionar', usuarioAutenticado, (req, res) => {
    db.all("SELECT nome FROM caracteristica WHERE tipo = 'plataforma'", (err, plataformas) => {
        if (err) {
            plataformas = [];
        }
    
        db.all("SELECT nome FROM caracteristica WHERE tipo = 'categoria'", (err, categorias) => {
            if (err) {
                categorias = [];
            }
    
            db.all("SELECT nome FROM caracteristica WHERE tipo = 'conhecimento'", (err, conhecimentos) => {
                if (err) {
                    conhecimentos = [];
                }

                db.all("SELECT nome FROM caracteristica WHERE tipo = 'idioma'", (err, idiomas) => {
                    if (err) {
                        idiomas = [];
                    }
                    // renderiza a página com as listas (vazias ou preenchidas)
                    res.render('admin/adicionar-jogo', { plataformas, categorias, conhecimentos, idiomas });
                });
            });
        });
    });
    
}); 

//rota para adicionar jogo
router.post('/admin/jogos/adicionar', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), (req, res) => {
    try {
        const { nome, ano, plataforma, categoria, conhecimento, idioma, descricao, linkTitle, linkURL } = req.body;

        //verifica se as plataformas, categorias e conhecimentos são arrays ou strings únicas
        const plataformas = Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean);
        const categorias = Array.isArray(categoria) ? categoria : [categoria].filter(Boolean);
        const conhecimentos = Array.isArray(conhecimento) ? conhecimento : [conhecimento].filter(Boolean);
        const idiomas = Array.isArray(idioma) ? idioma : [idioma].filter(Boolean);

        //links externos
        const linksExternos = Array.isArray(linkTitle) && Array.isArray(linkURL)
            ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }))
            : linkTitle && linkURL
                ? [{ title: linkTitle, url: linkURL }]
                : [];

        //converte o nome do jogo em slug
        const slug = slugify(nome, { lower: true });

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
        db.run(
            `INSERT INTO jogo (nome, ano, plataforma, categoria, conhecimento, idioma, descricao, links, imagens, slug, data_criacao, data_modificacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                ano,
                JSON.stringify(plataformas),
                JSON.stringify(categorias),
                JSON.stringify(conhecimentos),
                JSON.stringify(idiomas),
                descricao,
                JSON.stringify(linksExternos),
                JSON.stringify(imagensBase64),  //agora as imagens incluem a capa no índice 0
                slug,
                dataAtual,
                dataAtual
            ],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Erro ao salvar o jogo no banco de dados' });
                }
                res.redirect('/admin'); //redirecionar para a página de administração
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar o jogo' });
    }
});

module.exports = router;