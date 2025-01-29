const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const pool = require('./db');
const { usuarioAutenticado } = require('./rotasLogin');
const upload = require('./upload');


router.get('/admin/jogos/editar/:slug', usuarioAutenticado, async (req, res) => {
    const slug = req.params.slug;

    try {
        // Busca o jogo pelo slug
        const result = await pool.query('SELECT * FROM jogo WHERE slug = $1', [slug]);
        const jogo = result.rows[0];

        if (!jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        // Acessa os campos jsonb diretamente, sem necessidade de JSON.parse()
        jogo.plataforma = jogo.plataforma || [];
        jogo.categoria = jogo.categoria || [];
        jogo.conhecimento = jogo.conhecimento || [];
        jogo.idioma = jogo.idioma || [];
        jogo.links = jogo.links || [];
        jogo.imagens = jogo.imagens || [];

        // Carrega a imagem de capa e as outras imagens
        const imagemCapa = jogo.imagens[0] || null;
        const outrasImagens = jogo.imagens.slice(1);

        // Carrega as listas de características
        const [plataformas, categorias, conhecimentos, idiomas] = await Promise.all([
            pool.query("SELECT nome FROM caracteristica WHERE tipo = 'plataforma'"),
            pool.query("SELECT nome FROM caracteristica WHERE tipo = 'categoria'"),
            pool.query("SELECT nome FROM caracteristica WHERE tipo = 'conhecimento'"),
            pool.query("SELECT nome FROM caracteristica WHERE tipo = 'idioma'")
        ]);

        // Renderiza a página com as variáveis
        res.render('admin/edit-add', {
            jogo: {
                ...jogo,
                imagemCapa: imagemCapa,
                outrasImagens: outrasImagens
            },
            plataformas: plataformas.rows,
            categorias: categorias.rows,
            conhecimentos: conhecimentos.rows,
            idiomas: idiomas.rows,
            isEdit: true
        });

    } catch (err) {
        console.error("Erro ao editar jogo:", err);
        return res.status(500).send('Erro ao carregar os dados para edição');
    }
});


router.post('/editar-jogo/:slug', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), async (req, res) => {
    const slug = req.params.slug;

    // processa elementos removidos na edição, se houver
    const removedImages = req.body.removedImages ? JSON.parse(req.body.removedImages) : [];
    const removedPlataformas = req.body.removedPlataformas ? JSON.parse(req.body.removedPlataformas) : [];
    const removedCategorias = req.body.removedCategorias ? JSON.parse(req.body.removedCategorias) : [];
    const removedConhecimentos = req.body.removedConhecimentos ? JSON.parse(req.body.removedConhecimentos) : [];
    const removedIdiomas = req.body.removedIdiomas ? JSON.parse(req.body.removedIdiomas) : [];
    const removedLinks = req.body.removedLinks ? JSON.parse(req.body.removedLinks) : [];

    try {
        // Buscar o jogo no banco de dados
        const result = await pool.query('SELECT * FROM jogo WHERE slug = $1', [slug]);
        const jogo = result.rows[0];

        if (!jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        // Desestruturando os dados do corpo da requisição
        const { nome, ano, plataforma, categoria, conhecimento, idioma, descricao, linkTitle, linkURL } = req.body;

        const novoNome = nome || jogo.nome;
        const novoAno = ano || jogo.ano;
        const novaDescricao = descricao || jogo.descricao;

        // Processamento das plataformas
        const plataformasAntigas = jogo.plataforma || [];
        const plataformasNovas = plataforma ? (Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean)) : [];
        const plataformasCombinadas = [...new Set([...plataformasAntigas, ...plataformasNovas])]
                                          .filter(plat => !removedPlataformas.includes(plat));

        // Processamento das categorias
        const categoriasAntigas = jogo.categoria || [];
        const categoriasNovas = categoria ? (Array.isArray(categoria) ? categoria : [categoria].filter(Boolean)) : [];
        const categoriasCombinadas = [...new Set([...categoriasAntigas, ...categoriasNovas])]
                                          .filter(cat => !removedCategorias.includes(cat));

        // Processamento dos conhecimentos
        const conhecimentosAntigos = jogo.conhecimento || [];
        const conhecimentosNovos = conhecimento ? (Array.isArray(conhecimento) ? conhecimento : [conhecimento].filter(Boolean)) : [];
        const conhecimentosCombinados = [...new Set([...conhecimentosAntigos, ...conhecimentosNovos])]
                                               .filter(disc => !removedConhecimentos.includes(disc));

        // Processamento dos idiomas
        const idiomasAntigos = jogo.idioma || [];
        const idiomasNovos = idioma ? (Array.isArray(idioma) ? idioma : [idioma].filter(Boolean)) : [];
        const idiomasCombinados = [...new Set([...idiomasAntigos, ...idiomasNovos])]
                                               .filter(idi => !removedIdiomas.includes(idi));

        // Processamento de links externos
        let linksExternos = Array.isArray(linkTitle) && Array.isArray(linkURL)
            ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }))
            : linkTitle && linkURL
                ? [{ title: linkTitle, url: linkURL }]
                : jogo.links || [];
        linksExternos = linksExternos.filter(link => !removedLinks.some(removedLink => removedLink.title === link.title && removedLink.url === link.url));

        // Processamento de imagens
        let capaBase64 = jogo.imagens ? jogo.imagens[0] : null;
        let imagensAntigas = jogo.imagens ? jogo.imagens.slice(1) : [];

        // Atualiza a imagem de capa, se houver uma nova
        if (req.files.imagemCapa && req.files.imagemCapa[0]) {
            const capaBuffer = req.files.imagemCapa[0].buffer;
            capaBase64 = capaBuffer.toString('base64');
        }

        // Remover as imagens excluídas
        imagensAntigas = imagensAntigas.filter(img => !removedImages.includes(img));

        // Adicionar novas imagens
        const imagensNovas = req.files.imagens ? req.files.imagens.map(file => file.buffer.toString('base64')) : [];

        // Organizar a lista de imagens (primeira imagem sendo a capa)
        const todasImagens = [capaBase64, ...imagensAntigas, ...imagensNovas].filter(Boolean);

        const novoSlug = slugify(novoNome, { lower: true });
        const dataAtual = new Date().toISOString();

        // Atualizar os dados no banco de dados, agora com JSON.stringify() para garantir a formatação correta
        await pool.query(
            `UPDATE jogo SET nome = $1, ano = $2, plataforma = $3, categoria = $4, conhecimento = $5, idioma = $6, descricao = $7, links = $8, imagens = $9, slug = $10, data_modificacao = $11 WHERE slug = $12`,
            [
                novoNome,
                novoAno,
                JSON.stringify(plataformasCombinadas), // Assegura que estamos enviando um JSON válido
                JSON.stringify(categoriasCombinadas),   // Assegura que estamos enviando um JSON válido
                JSON.stringify(conhecimentosCombinados),// Assegura que estamos enviando um JSON válido
                JSON.stringify(idiomasCombinados),      // Assegura que estamos enviando um JSON válido
                novaDescricao,
                JSON.stringify(linksExternos),          // Assegura que estamos enviando um JSON válido
                JSON.stringify(todasImagens),           // Assegura que estamos enviando um JSON válido
                novoSlug,
                dataAtual,
                slug
            ]
        );

        res.redirect('/admin'); // Redireciona após a edição ser concluída
    } catch (error) {
        console.error("Erro ao editar o jogo:", error);
        res.status(500).json({ success: false, message: 'Erro ao processar a edição do jogo' });
    }
});



module.exports = router;