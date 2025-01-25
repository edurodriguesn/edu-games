const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const db = require('./db');
const { usuarioAutenticado } = require('./rotasLogin');
const upload = require('./upload');


router.get('/admin/jogos/editar/:slug', usuarioAutenticado, (req, res) => {
    const slug = req.params.slug;

    db.get(`SELECT * FROM jogo WHERE slug = ?`, [slug], (err, jogo) => {
        if (err || !jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        //converte as strings JSON em arrays
        jogo.plataforma = jogo.plataforma ? JSON.parse(jogo.plataforma) : [];
        jogo.categoria = jogo.categoria ? JSON.parse(jogo.categoria) : [];
        jogo.conhecimento = jogo.conhecimento ? JSON.parse(jogo.conhecimento) : [];
        jogo.idioma = jogo.idioma ? JSON.parse(jogo.idioma) : [];
        jogo.links = jogo.links ? JSON.parse(jogo.links) : [];
        jogo.imagens = jogo.imagens ? JSON.parse(jogo.imagens) : [];

        //carrega a imagem de capa e as outras imagens
        const imagemCapa = jogo.imagens[0] || null;
        const outrasImagens = jogo.imagens.slice(1);

        //carrega as listas de caracteristicas
        db.all("SELECT nome FROM caracteristica where tipo = 'plataforma'", (err, plataformas) => {
            if (err) {
                return res.status(500).send('Erro ao carregar as plataformas');
            }
            db.all("SELECT nome FROM caracteristica where tipo = 'categoria'", (err, categorias) => {
                if (err) {
                    return res.status(500).send('Erro ao carregar as categorias');
                }
                db.all("SELECT nome FROM caracteristica where tipo = 'conhecimento'", (err, conhecimentos) => {
                    if (err) {
                        return res.status(500).send('Erro ao carregar as conhecimentos');
                    }
                    db.all("SELECT nome FROM caracteristica where tipo = 'idioma'", (err, idiomas) => {
                        if (err) {
                            return res.status(500).send('Erro ao carregar os idiomas');
                        }
                        //renderiza a página com as variáveis
                        res.render('admin/editar-jogo', {
                            jogo: {
                                ...jogo,
                                imagemCapa: imagemCapa,
                                outrasImagens: outrasImagens
                            },
                            plataformas,
                            categorias,
                            conhecimentos,
                            idiomas
                        });
                    });
                });
            });
        });
    });
});

router.post('/editar-jogo/:slug', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), (req, res) => {
    const slug = req.params.slug;

    //processa elementos removidos na edição, se houver
    const removedImages = req.body.removedImages ? JSON.parse(req.body.removedImages) : [];
    const removedPlataformas = req.body.removedPlataformas ? JSON.parse(req.body.removedPlataformas) : [];
    const removedCategorias = req.body.removedCategorias ? JSON.parse(req.body.removedCategorias) : [];
    const removedConhecimentos = req.body.removedConhecimentos ? JSON.parse(req.body.removedConhecimentos) : [];
    const removedIdiomas = req.body.removedIdiomas ? JSON.parse(req.body.removedIdiomas) : [];
    const removedLinks = req.body.removedLinks ? JSON.parse(req.body.removedLinks) : [];

    db.get("SELECT * FROM jogo WHERE slug = ?", [slug], (err, jogo) => {
        if (err || !jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        try {
            const { nome, ano, plataforma, categoria, conhecimento, idioma, descricao, linkTitle, linkURL } = req.body;

            const novoNome = nome || jogo.nome;
            const novoAno = ano || jogo.ano;
            const novaDescricao = descricao || jogo.descricao;

            //processamento de plataformas
            const plataformasAntigas = jogo.plataforma ? JSON.parse(jogo.plataforma) : [];
            const plataformasNovas = plataforma ? (Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean)) : [];
            const plataformasCombinadas = [...new Set([...plataformasAntigas, ...plataformasNovas])]
                                          .filter(plat => !removedPlataformas.includes(plat));

            //processamento de categorias
            const categoriasAntigas = jogo.categoria ? JSON.parse(jogo.categoria) : [];
            const categoriasNovas = categoria ? (Array.isArray(categoria) ? categoria : [categoria].filter(Boolean)) : [];
            const categoriasCombinadas = [...new Set([...categoriasAntigas, ...categoriasNovas])]
                                          .filter(cat => !removedCategorias.includes(cat));

            //processamento de conhecimentos
            const conhecimentosAntigos = jogo.conhecimento ? JSON.parse(jogo.conhecimento) : [];
            const conhecimentosNovos = conhecimento ? (Array.isArray(conhecimento) ? conhecimento : [conhecimento].filter(Boolean)) : [];
            const conhecimentosCombinados = [...new Set([...conhecimentosAntigos, ...conhecimentosNovos])]
                                               .filter(disc => !removedConhecimentos.includes(disc));

            //processamento de idiomas
            const idiomasAntigos = jogo.idioma ? JSON.parse(jogo.idioma) : [];
            const idiomasNovos = idioma ? (Array.isArray(idioma) ? idioma : [idioma].filter(Boolean)) : [];
            const idiomasCombinados = [...new Set([...idiomasAntigos, ...idiomasNovos])]
                                               .filter(idi => !removedIdiomas.includes(idi));
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
                `UPDATE jogo SET nome = ?, ano = ?, plataforma = ?, categoria = ?, conhecimento = ?, idioma = ?, descricao = ?, links = ?, imagens = ?, slug = ?, data_modificacao = ? WHERE slug = ?`,
                [
                    novoNome,
                    novoAno,
                    JSON.stringify(plataformasCombinadas),
                    JSON.stringify(categoriasCombinadas),
                    JSON.stringify(conhecimentosCombinados),
                    JSON.stringify(idiomasCombinados),
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