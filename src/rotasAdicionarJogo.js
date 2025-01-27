const express = require('express');
const router = express.Router();
const pool = require('./db'); 
const slugify = require('slugify');
const { usuarioAutenticado } = require('./rotasLogin');
const upload = require('./upload');

// rota para renderizar a página de criação de novo jogo:
router.get('/admin/jogos/adicionar', usuarioAutenticado, async (req, res) => {
    try {
        const plataformasResult = await pool.query("SELECT nome FROM caracteristica WHERE tipo = $1", ['plataforma']);
        const plataformas = plataformasResult.rows || [];

        const categoriasResult = await pool.query("SELECT nome FROM caracteristica WHERE tipo = $1", ['categoria']);
        const categorias = categoriasResult.rows || [];

        const conhecimentosResult = await pool.query("SELECT nome FROM caracteristica WHERE tipo = $1", ['conhecimento']);
        const conhecimentos = conhecimentosResult.rows || [];

        const idiomasResult = await pool.query("SELECT nome FROM caracteristica WHERE tipo = $1", ['idioma']);
        const idiomas = idiomasResult.rows || [];

        res.render('admin/edit-add', {jogo: {}, plataformas, categorias, conhecimentos, idiomas, isEdit: false});
    } catch (err) {
        res.status(500).send('Erro ao carregar as opções para adicionar o jogo');
    }
});


//rota para adicionar jogo
router.post('/admin/jogos/adicionar', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), async (req, res) => {
    try {
        const { nome, ano, plataforma, categoria, conhecimento, idioma, descricao, linkTitle, linkURL } = req.body;

        // Verifica se as plataformas, categorias e conhecimentos são arrays ou strings únicas
        const plataformas = Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean);
        const categorias = Array.isArray(categoria) ? categoria : [categoria].filter(Boolean);
        const conhecimentos = Array.isArray(conhecimento) ? conhecimento : [conhecimento].filter(Boolean);
        const idiomas = Array.isArray(idioma) ? idioma : [idioma].filter(Boolean);

        // Links externos
        const linksExternos = Array.isArray(linkTitle) && Array.isArray(linkURL)
            ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }))
            : linkTitle && linkURL
                ? [{ title: linkTitle, url: linkURL }]
                : [];

        // Converte o nome do jogo em slug
        const slug = slugify(nome, { lower: true });

        // Processar imagem de capa
        let capaBase64 = null;
        if (req.files.imagemCapa) {
            const capaBuffer = req.files.imagemCapa[0].buffer;  // Pega o buffer da imagem da memória
            capaBase64 = capaBuffer.toString('base64');  // Converte para base64
        }

        // Processar demais imagens
        const imagensBase64 = req.files.imagens
            ? req.files.imagens.map(file => {
                const imageBuffer = file.buffer;  // Pega o buffer da imagem da memória
                return imageBuffer.toString('base64');  // Converte para base64
            })
            : [];

        // A imagem de capa fica no índice 0
        imagensBase64.unshift(capaBase64);

        // Obter a data e hora atual para data_criacao e data_modificacao
        const dataAtual = new Date().toISOString();

        // Formatação JSONB para colunas específicas
        const plataformasJsonb = JSON.stringify(plataformas);
        const categoriasJsonb = JSON.stringify(categorias);
        const conhecimentosJsonb = JSON.stringify(conhecimentos);
        const idiomasJsonb = JSON.stringify(idiomas);
        const linksJsonb = JSON.stringify(linksExternos);
        const imagensJsonb = JSON.stringify(imagensBase64);  // Imagens incluindo a capa no índice 0

        // Salvar as informações no banco de dados
        const query = `
            INSERT INTO jogo 
            (nome, ano, plataforma, categoria, conhecimento, idioma, descricao, links, imagens, slug, data_criacao, data_modificacao) 
            VALUES 
            ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10, $11, $12)
        `;
        
        await pool.query(query, [
            nome,
            ano,
            plataformasJsonb,  
            categoriasJsonb,    
            conhecimentosJsonb, 
            idiomasJsonb,       
            descricao,
            linksJsonb,         
            imagensJsonb,       
            slug,
            dataAtual,
            dataAtual
        ]);

        res.redirect('/admin'); // Redirecionar para a página de administração
    } catch (error) {
        console.error('Erro ao adicionar o jogo:', error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar o jogo' });
    }
});


module.exports = router;