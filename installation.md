# Como Executar o EduGames

## Requisitos 

- NodeJs
- PostgreSQL

### Observações
Caso vá utilizar o Docker não é necessário instalar os requisitos

### Crie o Arquivo .env

```bash
cp .env.example .env
```

(Certifique-se de preencher as informações)

## Passos para Executar o Projeto

### 1. Subir os Containers com Docker

- Execute o comando para construir as imagens Docker:
```bash
docker compose build
```
- Suba os containers:
  
```bash
docker compose up
```

### 2. Acessar o Terminal do Docker
- Acesse o terminal do Docker com o seguinte comando:
```bash
docker compose exec app bash
```


## Caso não esteja utilizando docker:

### Executar o script do Banco de Dados
```bash
psql -U postgres
\i /caminho/games-hub/db_script.sql
```
- Não esqueça de ajustar o caminho do projeto
##

### 3. Instalar as Dependências
- Para instalar as dependências necessárias
```bash
npm install
``` 

- Para buildar os arquivos estáticos e não precisar rodar o comando npm run dev
```bash
npm run build
```

### 4. Iniciar a Aplicação
```bash
npm run start
```

- Iniciar sem ter feito o build
```bash
npm run dev
```
