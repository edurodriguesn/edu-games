document.querySelectorAll('.game-card').forEach(card => {
    const images = JSON.parse(card.getAttribute('data-images'));
    let currentIndex = 0;
    let interval;

    card.addEventListener('mouseenter', () => {
        interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % images.length; //loop pelas imagens
            const imgElement = card.querySelector('img');
            imgElement.src = `data:image/jpeg;base64,${images[currentIndex]}`;
        }, 1000); //troca a cada 1 segundo
    });

    card.addEventListener('mouseleave', () => {
        clearInterval(interval); //para o loop ao sair do mouse
        currentIndex = 0; //reseta o índice se desejado
        const imgElement = card.querySelector('img');
        imgElement.src = `data:image/jpeg;base64,${images[currentIndex]}`; //retorna à primeira imagem
    });
}); //faz com que as imagens sejam trocadas automaticamente na página inicial

// função para mostrar o modal com a imagem
function showImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageSrc;
    modal.classList.remove('hidden');  // Remove 'hidden' para mostrar o modal
    modal.classList.add('flex');       // Adiciona 'flex' para usar o layout flex
}

// Função para fechar o modal
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('flex');   // Remove 'flex' para esconder o modal
    modal.classList.add('hidden');    // Adiciona 'hidden' para esconder o modal
}

// Fechar modal ao clicar fora da imagem
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('imageModal');
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeImageModal();
        }
    });
});


document.getElementById('searchForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Impede o envio padrão para modificarmos o URL
    const pesquisa = document.getElementById('pesquisa').value; // Valor do input
    const page = 1; // Valor dinâmico (se necessário, pode ser alterado com base em outros fatores)
    const limit = 9; // Valor dinâmico
    
    // Cria a URL com os parâmetros
    const url = `/pesquisa?pesquisa=${encodeURIComponent(pesquisa)}&page=${page}&limit=${limit}`;
    
    // Redireciona para a URL
    window.location.href = url;
});
