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

// Configuração para EJS: ok!
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para servir arquivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Criar tabelas se não existirem: OK!
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS conteudo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        ano INTEGER,
        plataforma TEXT,
        categoria TEXT,
        desenvolvedores TEXT,
        descricao TEXT,                                      -- Campo para descrição do conteúdo
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
    db.all("SELECT * FROM conteudo", [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.render('index', { conteudos: rows }); //carrega o template 'index' e envia a coluna conteúdos para o template
    });
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

/*=============================
    ADMINISTRAÇÃO DE CONTEÚDO
  =============================*/
// Rota para renderizar a página de admin: OK!
// Rota para carregar conteúdos e permitir ordenação por data de criação ou modificação
app.get('/admin', isAuthenticated, (req, res) => {
    const sortField = req.query.sort === 'data_modificacao' ? 'data_modificacao' : 'data_criacao'; // Ordenar por data de criação como padrão

    const query = `SELECT id, nome, data_criacao, data_modificacao FROM conteudo ORDER BY ${sortField} DESC`;

    db.all(query, (err, conteudos) => {
        if (err) {
            return res.status(500).send('Erro ao carregar os conteúdos');
        }

        res.render('admin', { conteudos, sort: sortField });
    });
});

// Rota para excluir um conteúdo
app.post('/admin/conteudos/:id/delete', isAuthenticated, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM conteudo WHERE id = ?", [id], (err, conteudo) => {
        if (err) {
            return res.status(500).send('Erro ao carregar o conteúdo');
        }

        // Verificar se o conteúdo foi encontrado
        if (!conteudo) {
            return res.status(404).send('Conteúdo não encontrado');
        }

        // Excluir imagens do sistema de arquivos usando o slug do nome
        const slug = conteudo.slug; // Assumindo que o slug é um campo da tabela 'conteudo'
        const imagens = JSON.parse(conteudo.imagens); // Assumindo que as imagens são armazenadas como JSON

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
            // Use fs.rmSync para exclusão recursiva
            fs.rmSync(slugDir, { recursive: true, force: true }); // Exclui o diretório mesmo se não estiver vazio
        }

        // Excluir o conteúdo do banco de dados
        db.run("DELETE FROM conteudo WHERE id = ?", [id], (err) => {
            if (err) {
                return res.status(500).send('Erro ao excluir o conteúdo');
            }

            // Redirecionar para a página de administração
            res.redirect('/admin');
        });
    });
});




// Rota para renderizar a página de edição de conteúdo
app.get('/admin/conteudos/:id/edit', isAuthenticated, (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM conteudo WHERE id = ?", [id], (err, conteudo) => {
        if (err) {
            return res.status(500).send('Erro ao carregar o conteúdo');
        }
        res.render('edit-content', { conteudo });
    });
});
// Rota para processar a edição de conteúdo
app.post('/admin/conteudos/:id/edit', isAuthenticated, upload.array('imagens'), (req, res) => {
    const { id } = req.params;
    const { nome, ano, plataforma, categoria, desenvolvedores, descricao, linkTitle, linkURL } = req.body;
    const linksExternos = Array.isArray(linkTitle) ? linkTitle.map((titulo, index) => ({ titulo, url: linkURL[index] })) : [{ titulo: linkTitle, url: linkURL }];
    const slug = slugify(nome, { lower: true });

    // Criar pasta com o nome do conteúdo em slug dentro da pasta 'uploads'
    const contentDir = path.join(__dirname, 'uploads', slug);
    if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true });
    }

    // Mover imagens para a pasta criada
    const imagens = req.files.map(file => {
        const newFilePath = path.join(contentDir, file.originalname);
        fs.renameSync(file.path, newFilePath);
        return path.relative(__dirname, newFilePath);
    });

    const imagensStr = JSON.stringify(imagens);

    db.run(`UPDATE conteudo SET nome = ?, ano = ?, plataforma = ?, categoria = ?, desenvolvedores = ?, imagens = ? WHERE id = ?`,
        [nome, ano, plataforma, categoria, desenvolvedores, imagensStr, id],
        (err) => {
            if (err) {
                return res.status(500).send('Erro ao atualizar o conteúdo');
            }
            res.redirect('/admin');
        });
});

/*============================
       ADIÇÃO DE CONTEÚDO
  ============================*/
// Rota para renderizar a página de criação de novo conteúdo: OK!
app.get('/admin/conteudos/new', isAuthenticated, (req, res) => {
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
                res.render('new-content', { plataformas, categorias, desenvolvedores });
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

    db.run(`INSERT INTO ${tableName} (nome) VALUES (?)`, [nome], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao adicionar a nova opção' });
        }
        res.status(200).json({ success: true, message: 'Opção adicionada com sucesso' });
    });
});

// Rota para adicionar conteúdo
app.post('/add-content', upload.array('imagens'), (req, res) => {
    try {
        const { nome, ano, plataforma, categoria, desenvolvedor, descricao, linkTitle, linkURL } = req.body;
        const linksExternos = Array.isArray(linkTitle) ? linkTitle.map((titulo, index) => ({ title: titulo, url: linkURL[index] })) : [{ title: linkTitle, url: linkURL }];
        const slug = slugify(nome, { lower: true });

        // Criar pasta com o nome do conteúdo em slug dentro da pasta 'uploads'
        const contentDir = path.join(__dirname, 'public','uploads', slug);
        if (!fs.existsSync(contentDir)) {
            fs.mkdirSync(contentDir, { recursive: true });
        }

        // Mover imagens para a pasta criada
        const imagens = req.files.map(file => {
            const newFilePath = path.join(contentDir, file.originalname);
            fs.renameSync(file.path, newFilePath);
            return path.relative(__dirname, newFilePath);
        });

        // Dados do conteúdo
        const conteudo = {
            id: this.lastID,
            titulo: nome,
            ano,
            plataforma,
            categoria,
            desenvolvedor,
            descricao,
            links: linksExternos,
            imagens
        };

        // Gerar a página HTML usando o template.ejs
        const templatePath = path.join(__dirname, 'views', 'template.ejs');
        const htmlContent = ejs.render(fs.readFileSync(templatePath, 'utf-8'), { conteudo });

        // Salvar a página HTML na pasta do conteúdo
        const htmlFilePath = path.join(__dirname, 'public', 'jogos', `${slug}.html`);
        fs.writeFileSync(htmlFilePath, htmlContent);


        // Obter a data e hora atual para data_criacao e data_modificacao
        const dataAtual = new Date().toISOString();

        // Salvar as informações no banco de dados com a data de criação e modificação
        db.run(
            `INSERT INTO conteudo (nome, ano, plataforma, categoria, desenvolvedores, descricao, links, imagens, slug, data_criacao, data_modificacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [nome, ano, plataforma, categoria, desenvolvedor, descricao, JSON.stringify(linksExternos), JSON.stringify(imagens), slug, dataAtual, dataAtual], 
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Erro ao salvar o conteúdo no banco de dados' });
                }
                res.status(200).json({ success: true, message: 'Conteúdo adicionado com sucesso'});
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar o conteúdo' });
    }
});


// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});