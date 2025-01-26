const { Pool } = require('pg');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
  	user: process.env.POSTGRES_USER,
  	host: process.env.POSTGRES_HOST,
  	database: process.env.POSTGRES_DB,
  	password: process.env.POSTGRES_PASSWORD,
  	port: process.env.POSTGRES_PORT,
});

// Função para criar as tabelas
(async () => {
  	try {
    	const client = await pool.connect();

    await client.query(`
      	CREATE TABLE IF NOT EXISTS jogo (
        	id SERIAL PRIMARY KEY,
        	nome TEXT NOT NULL,
        	ano INTEGER,
        	plataforma JSONB,        
        	categoria JSONB,         
        	conhecimento JSONB,      
        	idioma JSONB,            
        	descricao TEXT,
        	links JSONB,             
        	imagens JSONB,           
        	slug TEXT UNIQUE,
        	data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        	data_modificacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      	)
    `);
    
    await client.query(`
      	CREATE TABLE IF NOT EXISTS caracteristica (
        	id SERIAL PRIMARY KEY,
        	tipo TEXT,
        	nome TEXT UNIQUE,
        	slug TEXT UNIQUE
      	)
    `);
    console.log('Conexão com o banco de dados estabelecida.');
    client.release();
  	} catch (err) {
		console.error('Erro ao criar tabelas:', err.message);
  	}
})();

module.exports = pool;
