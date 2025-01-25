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

//cria as tabelas no banco de dados
db.serialize(() => {
    //tabela de jogos
    db.run(`CREATE TABLE IF NOT EXISTS jogo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        ano INTEGER,
        plataforma TEXT,
        categoria TEXT,
        conhecimento TEXT,
        idioma TEXT,
        descricao TEXT,                                      
        links TEXT,                                          
        imagens TEXT,                                        
        slug TEXT UNIQUE,                                    
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,     
        data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP 
    )`);
    
    //tabela de características
    db.run(`CREATE TABLE IF NOT EXISTS caracteristica (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT,
        nome TEXT UNIQUE,
        slug TEXT UNIQUE
    )`);
});

module.exports = db;
