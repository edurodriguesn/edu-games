# Etapa 1: Construção da imagem do Node.js
FROM node:18 AS build

# Definir o diretório de trabalho
WORKDIR /app

# Copiar os arquivos do projeto para dentro do container
COPY package.json package-lock.json ./

# Instalar as dependências
RUN npm install

# Copiar o código fonte para dentro do container
COPY . .

# Expor a porta 3000, onde o Node.js vai rodar
EXPOSE 3000

# Rodar o servidor Node.js
CMD ["npm", "start"]
