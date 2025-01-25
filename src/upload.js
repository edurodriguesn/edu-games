const multer = require('multer');

//configuração do multer para armazenar imagens na memória como Buffer

const storage = multer.memoryStorage();

const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por arquivo, ajuste conforme necessário
        fieldSize: 20 * 1024 * 1024, //limite máximo para todos os campos (ajustar conforme necessário)
    },
});

module.exports = upload;