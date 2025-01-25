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
    modal.classList.remove('hidden');
}

// função para fechar o modal
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.add('hidden');
}

// fechar modal ao clicar fora da imagem
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('imageModal');
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeImageModal();
        }
    });
});
