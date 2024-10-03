const express = require('express');
const multer = require('multer');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');
const ejs = require('ejs');

const app = express();



// Configuração do multer para armazenar imagens na memória como Buffer
const storage = multer.memoryStorage();

const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por arquivo, ajuste conforme necessário
        fieldSize: 20 * 1024 * 1024, // Limite máximo para todos os campos (ajustar conforme necessário)
    },
});

const db = new sqlite3.Database('./db/database.db');

// Middleware para processar o corpo da requisição
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração sessão
app.use(session({
    secret: 'secreto123',
    resave: false,
    saveUninitialized: true,
}));

app.use(express.static(path.join(__dirname, '/')));

// Configuração para EJS: ok!
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para servir arquivos estáticos
app.use(express.static('public'));

// Criar tabelas se não existirem: OK!
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS jogo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        ano INTEGER,
        plataformas TEXT,
        categorias TEXT,
        desenvolvedores TEXT,
        descricao TEXT,                                      -- Campo para descrição do jogo
        links TEXT,                                          -- Links externos (armazenado como JSON)
        imagens TEXT,                                        -- Imagens (armazenado como JSON)
        slug TEXT UNIQUE,                                    -- Slug único para URL amigável
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,     -- Data de criação
        data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP  -- Data de modificação
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS plataforma (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS desenvolvedor (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE
    )`);
});



//renderizar pagina inicial: OK!
app.get('/', (req, res) => {
    db.all("SELECT nome, slug, imagens FROM jogo", [], (err, rows) => {
        if (err) {
            throw err;
        }
        
        // Mapeia os resultados para incluir apenas os campos desejados
        const jogos = rows.map(row => ({
            nome: row.nome,
            slug: row.slug,
            imagens: JSON.parse(row.imagens) // Supondo que as imagens estejam em formato JSON
        }));

        res.render('index', { jogos });
    });
});


app.get('/sobre', (req, res) => {
    res.render('sobre');
});

/*==============================/
    PROCESSAMENTO DE LOGIN (OK!)
  ==============================*/
// Rota para renderizar a página de login: OK!
app.get('/login', (req, res) => {
    res.render('login');
});
// Rota para processar o login: OK!
app.post('/login', (req, res) => { //envia uma requisição post para o servidor
    const { username, password } = req.body; //extrai as variáveis de login do request body
    if (username === 'admin' && password === 'senha123') {
        req.session.loggedIn = true;
        res.redirect('/admin'); //redireciona para a página de administrador 
    } else {
        res.redirect('/login'); //se tiver dados errados, retorna novamente a página de login
    }
});
// Middleware para verificar se o usuário está logado: OK!
function isAuthenticated(req, res, next) {
    if (req.session.loggedIn) {
        return next();
    } else {
        res.redirect('/login');
    }
}

/*==========g===================
    ADMINISTRAÇÃO DE jogo
  =============================*/
// Rota para renderizar a página de admin: OK!
app.get('/admin', isAuthenticated, (req, res) => {
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
app.post('/admin/jogos/:id/delete', isAuthenticated, (req, res) => {
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



/*============================
       ADIÇÃO DE jogo
  ============================*/
// Rota para renderizar a página de criação de novo jogo: OK!
app.get('/admin/jogos/adicionar', isAuthenticated, (req, res) => {
    db.all("SELECT nome FROM plataforma", (err, plataformas) => {
        if (err) {
            return res.status(500).send('Erro ao carregar as plataformas');
        }
        db.all("SELECT nome FROM categoria", (err, categorias) => {
            if (err) {
                return res.status(500).send('Erro ao carregar as categorias');
            }
            db.all("SELECT nome FROM desenvolvedor", (err, desenvolvedores) => {
                if (err) {
                    return res.status(500).send('Erro ao carregar os desenvolvedores');
                }
                res.render('adicionar-jogo', { plataformas, categorias, desenvolvedores });
            });
        });
    });
});
// Rota para adicionar uma nova opção (plataforma, categoria ou desenvolvedor): OK!
app.post('/add-option', (req, res) => {
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


// Rota para adicionar jogo
// Adicionar novo jogo
app.post('/adicionarjogo', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), (req, res) => {
    try {
        const { nome, ano, plataforma, categoria, desenvolvedor, descricao, linkTitle, linkURL } = req.body;

        // Verifica se as plataformas, categorias e desenvolvedores são arrays ou strings únicas
        const plataformas = Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean);
        const categorias = Array.isArray(categoria) ? categoria : [categoria].filter(Boolean);
        const desenvolvedores = Array.isArray(desenvolvedor) ? desenvolvedor : [desenvolvedor].filter(Boolean);

        // Links externos
        const linksExternos = Array.isArray(linkTitle) && Array.isArray(linkURL)
            ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }))
            : linkTitle && linkURL
                ? [{ title: linkTitle, url: linkURL }]
                : [];

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

        // Salvar as informações no banco de dados
        db.run(
            `INSERT INTO jogo (nome, ano, plataformas, categorias, desenvolvedores, descricao, links, imagens, slug, data_criacao, data_modificacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                ano,
                JSON.stringify(plataformas),
                JSON.stringify(categorias),
                JSON.stringify(desenvolvedores),
                descricao,
                JSON.stringify(linksExternos),
                JSON.stringify(imagensBase64),  // Agora as imagens incluem a capa no índice 0
                slug,
                dataAtual,
                dataAtual
            ],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Erro ao salvar o jogo no banco de dados' });
                }
                res.redirect('/admin'); // Redirecionar para a página de administração
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar o jogo' });
    }
});

app.get('/jogos/:slug', (req, res) => {
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

        // Renderizar o template EJS com os dados do jogo
        res.render('template', {
            jogo: {
                nome: jogo.nome,
                ano: jogo.ano,
                plataformas: JSON.parse(jogo.plataformas),
                categorias: JSON.parse(jogo.categorias),
                desenvolvedores: JSON.parse(jogo.desenvolvedores),
                descricao: jogo.descricao,
                links: JSON.parse(jogo.links),
                imagens: JSON.parse(jogo.imagens),
                slug: jogo.slug
            }
        });
    });
});

app.get('/admin/jogos/editar/:slug', isAuthenticated, (req, res) => {
    const slug = req.params.slug;

    db.get(`SELECT * FROM jogo WHERE slug = ?`, [slug], (err, jogo) => {
        if (err || !jogo) {
            return res.status(404).send('Jogo não encontrado');
        }

        // Certifique-se de que as propriedades sejam arrays
        jogo.plataformas = jogo.plataformas ? JSON.parse(jogo.plataformas) : [];
        jogo.categorias = jogo.categorias ? JSON.parse(jogo.categorias) : [];
        jogo.desenvolvedores = jogo.desenvolvedores ? JSON.parse(jogo.desenvolvedores) : [];
        jogo.links = jogo.links ? JSON.parse(jogo.links) : [];
        jogo.imagens = jogo.imagens ? JSON.parse(jogo.imagens) : [];

        // Carregue a imagem de capa e as outras imagens
        const imagemCapa = jogo.imagens[0] || null; // Imagem de capa
        const outrasImagens = jogo.imagens.slice(1); // Outras imagens

        // Carregue as listas de plataformas, categorias e desenvolvedores
        db.all("SELECT nome FROM plataforma", (err, plataformas) => {
            if (err) {
                return res.status(500).send('Erro ao carregar as plataformas');
            }
            db.all("SELECT nome FROM categoria", (err, categorias) => {
                if (err) {
                    return res.status(500).send('Erro ao carregar as categorias');
                }
                db.all("SELECT nome FROM desenvolvedor", (err, desenvolvedores) => {
                    if (err) {
                        return res.status(500).send('Erro ao carregar os desenvolvedores');
                    }
                    // Renderize a página com as novas variáveis
                    res.render('editar-jogo', {
                        jogo: {
                            ...jogo,
                            imagemCapa: imagemCapa,
                            outrasImagens: outrasImagens // Certifique-se de passar aqui
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

app.post('/editar-jogo/:slug', upload.fields([{ name: 'imagemCapa', maxCount: 1 }, { name: 'imagens' }]), (req, res) => {
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

            // Processamento de plataformas
            const plataformasAntigas = jogo.plataformas ? JSON.parse(jogo.plataformas) : [];
            const plataformasNovas = plataforma ? (Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean)) : [];
            const plataformasCombinadas = [...new Set([...plataformasAntigas, ...plataformasNovas])]
                                          .filter(plat => !removedPlataformas.includes(plat));

            // Processamento de categorias
            const categoriasAntigas = jogo.categorias ? JSON.parse(jogo.categorias) : [];
            const categoriasNovas = categoria ? (Array.isArray(categoria) ? categoria : [categoria].filter(Boolean)) : [];
            const categoriasCombinadas = [...new Set([...categoriasAntigas, ...categoriasNovas])]
                                          .filter(cat => !removedCategorias.includes(cat));

            // Processamento de desenvolvedores
            const desenvolvedoresAntigos = jogo.desenvolvedores ? JSON.parse(jogo.desenvolvedores) : [];
            const desenvolvedoresNovos = desenvolvedor ? (Array.isArray(desenvolvedor) ? desenvolvedor : [desenvolvedor].filter(Boolean)) : [];
            const desenvolvedoresCombinados = [...new Set([...desenvolvedoresAntigos, ...desenvolvedoresNovos])]
                                               .filter(dev => !removedDesenvolvedores.includes(dev));

            // Processamento de links
            let linksExternos = Array.isArray(linkTitle) && Array.isArray(linkURL)
                ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }))
                : linkTitle && linkURL
                    ? [{ title: linkTitle, url: linkURL }]
                    : jogo.links ? JSON.parse(jogo.links) : [];
            linksExternos = linksExternos.filter(link => !removedLinks.some(removedLink => removedLink.title === link.title && removedLink.url === link.url));

            // Processamento de imagens
            let capaBase64 = jogo.imagens ? JSON.parse(jogo.imagens)[0] : null;
            let imagensAntigas = jogo.imagens ? JSON.parse(jogo.imagens).slice(1) : [];

            // Atualizar a imagem de capa, se houver uma nova
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

            // Atualizar o banco de dados
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











// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});