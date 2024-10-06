const sqlite3 = require('sqlite3').verbose();
const path = require('path');

//cria o caminho correto para o banco de dados
const dbPath = path.join(__dirname, '..', 'db', 'database.db');

//abre uma conexão com o banco de dados SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error ao abrir a conexão com o banco de dados:', err.message);
  } else {
    console.log('Conectado com sucesso ao banco de dados.');
  }
});
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

module.exports = db;
