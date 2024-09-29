const express = require('express');
const multer = require('multer');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');
const ejs = require('ejs');

const app = express();
const upload = multer({ dest: 'uploads/' });
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    db.all("SELECT * FROM jogo", [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.render('index', { jogos: rows }); //carrega o template 'index' e envia a coluna jogos para o template
    });
    
});
app.get('/check-image', (req, res) => {
    const { slug, imageName } = req.query;
    const filePath = path.join(__dirname, 'public', 'uploads', slug, imageName);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.status(404).send('Not Found');
        } else {
            res.status(200).send('Exists');
        }
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

        // Excluir imagens do sistema de arquivos usando o slug do nome
        const slug = jogo.slug; // Assumindo que o slug é um campo da tabela 'jogo'
        const imagens = JSON.parse(jogo.imagens); // Assumindo que as imagens são armazenadas como JSON

        // Excluir cada imagem dentro do diretório
        imagens.forEach(imagem => {
            const imagePath = path.join(__dirname, 'public/uploads', slug, imagem);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath); // Excluir a imagem
            }
        });

        // Remover o diretório do slug de forma recursiva (inclui arquivos)
        const slugDir = path.join(__dirname, 'public/uploads', slug);
        if (fs.existsSync(slugDir)) {
            fs.rmSync(slugDir, { recursive: true, force: true }); // Exclui o diretório mesmo se não estiver vazio
        }

        // Excluir o arquivo HTML correspondente
        const htmlFilePath = path.join(__dirname, 'public/jogos', `${slug}.html`);
        if (fs.existsSync(htmlFilePath)) {
            fs.unlinkSync(htmlFilePath); // Excluir o arquivo HTML
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
app.post('/adicionarjogo', upload.array('imagens'), (req, res) => {
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

        // Criar pasta para as imagens do jogo
        const contentDir = path.join(__dirname, 'public', 'uploads', slug);
        if (!fs.existsSync(contentDir)) {
            fs.mkdirSync(contentDir, { recursive: true });
        }

        // Mover as imagens para a pasta do jogo e renomeá-las
        // Mover as imagens para a pasta do jogo e renomeá-las
        const imagens = req.files.map((file, index) => {
            const newFileName = `imagem-${index + 1}${path.extname(file.originalname)}`; // Renomeia como imagem-1, imagem-2, etc.
            const newFilePath = path.join(contentDir, newFileName);
            fs.renameSync(file.path, newFilePath);
            return newFileName; // Armazena apenas o novo nome
        });


        // Dados do jogo
        const jogo = {
            id: this.lastID,
            titulo: nome,
            ano,
            plataformas,
            categorias,
            desenvolvedores,
            descricao,
            links: linksExternos,
            imagens,
            slug
        };

        // Gerar a página HTML usando o template.ejs
        const templatePath = path.join(__dirname, 'views', 'template.ejs');
        const htmlContent = ejs.render(fs.readFileSync(templatePath, 'utf-8'), { 
            jogo, 
            path: require('path') // Adicione esta linha
        });
        
        // Salvar a página HTML na pasta do jogo
        const htmlFilePath = path.join(__dirname, 'public', 'jogos', `${slug}.html`);
        fs.writeFileSync(htmlFilePath, htmlContent);

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
                JSON.stringify(imagens), 
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
                    res.render('editar-jogo', { jogo, plataformas, categorias, desenvolvedores });
                });
            });
        });
    });
});


app.post('/editar-jogo/:slug', upload.array('imagens'), (req, res) => {
    const slug = req.params.slug;

    db.get("SELECT * FROM jogo WHERE slug = ?", [slug], (err, jogoAntigo) => {
        if (err || !jogoAntigo) {
            return res.status(404).send('Jogo não encontrado');
        }

        try {
            const { nome, ano, plataforma, categoria, desenvolvedor, descricao, linkTitle, linkURL, imagensRemovidas } = req.body;

            // Se os campos não foram enviados ou estão vazios, mantemos os valores antigos.
            const novoNome = nome || jogoAntigo.nome;
            const novoAno = ano || jogoAntigo.ano;
            const novaDescricao = descricao || jogoAntigo.descricao;

            // Manter as plataformas, categorias e desenvolvedores, e combinar com os novos valores
            const plataformasAntigas = JSON.parse(jogoAntigo.plataformas);
            const plataformasNovas = plataforma ? (Array.isArray(plataforma) ? plataforma : [plataforma].filter(Boolean)) : [];
            const plataformasCombinadas = [...plataformasAntigas, ...plataformasNovas]; // Combina as novas com as antigas

            const categoriasAntigas = JSON.parse(jogoAntigo.categorias);
            const categoriasNovas = categoria ? (Array.isArray(categoria) ? categoria : [categoria].filter(Boolean)) : [];
            const categoriasCombinadas = [...categoriasAntigas, ...categoriasNovas];

            const desenvolvedoresAntigos = JSON.parse(jogoAntigo.desenvolvedores);
            const desenvolvedoresNovos = desenvolvedor ? (Array.isArray(desenvolvedor) ? desenvolvedor : [desenvolvedor].filter(Boolean)) : [];
            const desenvolvedoresCombinados = [...desenvolvedoresAntigos, ...desenvolvedoresNovos];

            // Links externos
            let linksExternos = [];
            if (Array.isArray(linkTitle) && Array.isArray(linkURL)) {
                // Se ambos são arrays, mapear normalmente
                linksExternos = linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] }));
            } else if (linkTitle && linkURL) {
                // Se existe apenas um link (string única), transforma em um array de objeto
                linksExternos = [{ title: linkTitle, url: linkURL }];
            } else {
                // Se os links não foram alterados, mantém os existentes
                linksExternos = JSON.parse(jogoAntigo.links);
            }

            // Gerar o novo slug
            const novoSlug = slugify(novoNome, { lower: true });
            const novoContentDir = path.join(__dirname, 'public', 'uploads', novoSlug);
            const antigoContentDir = path.join(__dirname, 'public', 'uploads', slug);

            // Se o nome mudou, renomeia a pasta de imagens
            if (novoSlug !== slug) {
                if (fs.existsSync(antigoContentDir)) {
                    fs.renameSync(antigoContentDir, novoContentDir);
                }
            }

            let novasImagens = [];
            let imagensAlteradas = false;

            // Se não houve alteração nas imagens, mantém as imagens existentes
            let imagensFinal = JSON.parse(jogoAntigo.imagens);

            // Excluir imagens removidas
            if (imagensRemovidas) {
                const imagensParaRemover = JSON.parse(imagensRemovidas);
                imagensParaRemover.forEach(imagem => {
                    const filePath = path.join(novoContentDir, imagem);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
                imagensFinal = imagensFinal.filter(imagem => !imagensParaRemover.includes(imagem));
                imagensAlteradas = true; // Sinaliza que houve uma exclusão de imagens
            }

            // Verifica quantas imagens já existem e define o índice inicial para as novas imagens
            let indiceInicial = imagensFinal.length;

            // Verifica se existem novas imagens para adicionar
            if (req.files.length > 0) {
                novasImagens = req.files.map((file, index) => {
                    const newFileName = `imagem-${indiceInicial + index + 1}${path.extname(file.originalname)}`;
                    const newFilePath = path.join(novoContentDir, newFileName);
                    fs.renameSync(file.path, newFilePath);
                    return newFileName;
                });
                imagensAlteradas = true; // Sinaliza que houve uma inserção de imagens
            }

            if (imagensAlteradas) {
                // Combina as novas imagens com as existentes
                imagensFinal = [...imagensFinal, ...novasImagens].filter(Boolean);
            }

            // Atualizar o jogo no banco de dados
            const dataAtual = new Date().toISOString();
            db.run(
                `UPDATE jogo SET nome = ?, ano = ?, plataformas = ?, categorias = ?, desenvolvedores = ?, descricao = ?, links = ?, imagens = ?, slug = ?, data_modificacao = ? WHERE slug = ?`, 
                [
                    novoNome, 
                    novoAno, 
                    JSON.stringify(plataformasCombinadas),  // Usar as plataformas combinadas
                    JSON.stringify(categoriasCombinadas),  // Usar as categorias combinadas
                    JSON.stringify(desenvolvedoresCombinados),  // Usar os desenvolvedores combinados
                    novaDescricao, 
                    JSON.stringify(linksExternos), 
                    JSON.stringify(imagensFinal), 
                    novoSlug, 
                    dataAtual,
                    slug
                ], 
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ success: false, message: 'Erro ao atualizar o jogo no banco de dados' });
                    }

                    // Se o nome do jogo mudou, remove a página HTML antiga
                    const antigoHtmlFilePath = path.join(__dirname, 'public', 'jogos', `${slug}.html`);
                    if (fs.existsSync(antigoHtmlFilePath)) {
                        fs.unlinkSync(antigoHtmlFilePath);
                    }

                    // Criar nova página HTML
                    const templatePath = path.join(__dirname, 'views', 'template.ejs');
                    const novoHtmlContent = ejs.render(fs.readFileSync(templatePath, 'utf-8'), { 
                        jogo: { ...jogoAntigo, nome: novoNome, ano: novoAno, descricao: novaDescricao, plataformas: plataformasCombinadas, categorias: categoriasCombinadas, desenvolvedores: desenvolvedoresCombinados, slug: novoSlug, imagens: imagensFinal, links: linksExternos }, 
                        path: require('path') 
                    });
                    const novoHtmlFilePath = path.join(__dirname, 'public', 'jogos', `${novoSlug}.html`);
                    fs.writeFileSync(novoHtmlFilePath, novoHtmlContent);

                    res.redirect('/admin'); // Redirecionar para a página de administração
                }
            );
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erro ao editar o jogo' });
        }
    });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});