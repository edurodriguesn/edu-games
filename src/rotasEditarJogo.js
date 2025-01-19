const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const db = require('./db');
const { usuarioAutenticado } = require('./rotasLogin');
const upload = require('./upload');


//middleware para processar o corpo da requisição
router.get('/admin/jogos/editar/:slug', usuarioAutenticado, (req, res) => {
    const slug = req.params.slug;

    db.get(`SELECT * FROM jogo WHERE slug = ?`, [slug], (err, jogo) => {
        if (err || !jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        //certifique-se de que as propriedades sejam arrays
        jogo.plataformas = jogo.plataformas ? JSON.parse(jogo.plataformas) : [];
        jogo.categorias = jogo.categorias ? JSON.parse(jogo.categorias) : [];
        jogo.desenvolvedores = jogo.desenvolvedores ? JSON.parse(jogo.desenvolvedores) : [];
        jogo.links = jogo.links ? JSON.parse(jogo.links) : [];
        jogo.imagens = jogo.imagens ? JSON.parse(jogo.imagens) : [];

        //carregue a imagem de capa e as outras imagens
        const imagemCapa = jogo.imagens[0] || null; //imagem de capa
        const outrasImagens = jogo.imagens.slice(1); //outras imagens

        //carregue as listas de plataformas, categorias e desenvolvedores
        db.all("SELECT nome FROM caracteristica where tipo = 'plataforma'", (err, plataformas) => {
            if (err) {
                return res.status(500).send('Erro ao carregar as plataformas');
            }
            db.all("SELECT nome FROM caracteristica where tipo = 'categoria'", (err, categorias) => {
                if (err) {
                    return res.status(500).send('Erro ao carregar as categorias');
                }
                db.all("SELECT nome FROM caracteristica where tipo = 'desenvolvedor'", (err, desenvolvedores) => {
                    if (err) {
                        return res.status(500).send('Erro ao carregar os desenvolvedores');
                    }
                    //renderize a página com as novas variáveis
                    res.render('editar-jogo', {
                        jogo: {
                            ...jogo,
                            imagemCapa: imagemCapa,
                            outrasImagens: outrasImagens //certifique-se de passar aqui
                        },
                        plataformas,
                        categorias,
                        desenvolvedores
                    });
                });
            });
        });
    });
});

router.post('/editar-jogo/:slug', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), (req, res) => {
    const slug = req.params.slug;
    const removedImages = req.body.removedImages ? JSON.parse(req.body.removedImages) : [];
    const removedPlataformas = req.body.removedPlataformas ? JSON.parse(req.body.removedPlataformas) : [];
    const removedCategorias = req.body.removedCategorias ? JSON.parse(req.body.removedCategorias) : [];
    const removedDesenvolvedores = req.body.removedDesenvolvedores ? JSON.parse(req.body.removedDesenvolvedores) : [];
    const removedLinks = req.body.removedLinks ? JSON.parse(req.body.removedLinks) : [];

    db.get("SELECT * FROM jogo WHERE slug = ?", [slug], (err, jogo) => {
        if (err || !jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        try {
            const { nome, ano, plataforma, categoria, desenvolvedor, descricao, linkTitle, linkURL } = req.body;

            const novoNome = nome || jogo.nome;
            const novoAno = ano || jogo.ano;
            const novaDescricao = descricao || jogo.descricao;

            //processamento de plataformas
            const plataformasAntigas = jogo.plataformas ? JSON.parse(jogo.plataformas) : [];
            const plataformasNovas = plataforma ? (Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean)) : [];
            const plataformasCombinadas = [...new Set([...plataformasAntigas, ...plataformasNovas])]
                                          .filter(plat => !removedPlataformas.includes(plat));

            //processamento de categorias
            const categoriasAntigas = jogo.categorias ? JSON.parse(jogo.categorias) : [];
            const categoriasNovas = categoria ? (Array.isArray(categoria) ? categoria : [categoria].filter(Boolean)) : [];
            const categoriasCombinadas = [...new Set([...categoriasAntigas, ...categoriasNovas])]
                                          .filter(cat => !removedCategorias.includes(cat));

            //processamento de desenvolvedores
            const desenvolvedoresAntigos = jogo.desenvolvedores ? JSON.parse(jogo.desenvolvedores) : [];
            const desenvolvedoresNovos = desenvolvedor ? (Array.isArray(desenvolvedor) ? desenvolvedor : [desenvolvedor].filter(Boolean)) : [];
            const desenvolvedoresCombinados = [...new Set([...desenvolvedoresAntigos, ...desenvolvedoresNovos])]
                                               .filter(dev => !removedDesenvolvedores.includes(dev));

            //processamento de links
            let linksExternos = Array.isArray(linkTitle) && Array.isArray(linkURL)
                ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }))
                : linkTitle && linkURL
                    ? [{ title: linkTitle, url: linkURL }]
                    : jogo.links ? JSON.parse(jogo.links) : [];
            linksExternos = linksExternos.filter(link => !removedLinks.some(removedLink => removedLink.title === link.title && removedLink.url === link.url));

            //processamento de imagens
            let capaBase64 = jogo.imagens ? JSON.parse(jogo.imagens)[0] : null;
            let imagensAntigas = jogo.imagens ? JSON.parse(jogo.imagens).slice(1) : [];

            //atualizar a imagem de capa, se houver uma nova
            if (req.files.imagemCapa && req.files.imagemCapa[0]) {
                const capaBuffer = req.files.imagemCapa[0].buffer;
                capaBase64 = capaBuffer.toString('base64');
            }

            //remover as imagens excluídas
            imagensAntigas = imagensAntigas.filter(img => !removedImages.includes(img));

            //adicionar novas imagens
            const imagensNovas = req.files.imagens ? req.files.imagens.map(file => file.buffer.toString('base64')) : [];

            //organizar a lista de imagens (primeira imagem sendo a capa)
            const todasImagens = [capaBase64, ...imagensAntigas, ...imagensNovas].filter(Boolean);

            const novoSlug = slugify(novoNome, { lower: true });
            const dataAtual = new Date().toISOString();

            //atualizar o banco de dados
            db.run(
                `UPDATE jogo SET nome = ?, ano = ?, plataformas = ?, categorias = ?, desenvolvedores = ?, descricao = ?, links = ?, imagens = ?, slug = ?, data_modificacao = ? WHERE slug = ?`,
                [
                    novoNome,
                    novoAno,
                    JSON.stringify(plataformasCombinadas),
                    JSON.stringify(categoriasCombinadas),
                    JSON.stringify(desenvolvedoresCombinados),
                    novaDescricao,
                    JSON.stringify(linksExternos),
                    JSON.stringify(todasImagens),
                    novoSlug,
                    dataAtual,
                    slug
                ],
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ success: false, message: 'Erro ao atualizar o jogo no banco de dados' });
                    }

                    res.redirect('/admin'); 
                }
            );
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erro ao processar a edição do jogo' });
        }
    });
});

module.exports = router;