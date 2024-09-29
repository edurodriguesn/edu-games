function createRemoveButton(container, element) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'bg-red-500 text-white font-bold rounded px-3 py-1 ml-2';
    removeButton.innerText = 'X';
    removeButton.onclick = () => container.removeChild(element);
    return removeButton;
}
function addOptionField(selectId, containerId, placeholder) {
    const select = document.getElementById(selectId);
    const container = document.getElementById(containerId);
    const selectedValue = select.options[select.selectedIndex].value;

    if (!selectedValue || Array.from(container.children).some(el => el.children[0].value === selectedValue)) {
        alert('Característica já adicionada ou não selecionada.');
        return;
    }

    const newField = document.createElement('div');
    newField.className = 'flex items-center mt-2';

    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.name = selectId;
    newInput.value = selectedValue;
    newInput.className = 'border rounded p-2 w-full';
    newInput.readOnly = true;

    const removeButton = createRemoveButton(container, newField);

    newField.appendChild(newInput);
    newField.appendChild(removeButton);
    container.appendChild(newField);
}


function addNewOption(selectId, inputId, containerId) {
    const input = document.getElementById(inputId);
    const newValue = input.value.trim();

    if (!newValue) {
        alert('Digite uma nova característica válida.');
        return;
    }

    // Verifica duplicatas no select
    const select = document.getElementById(selectId);
    if (Array.from(select.options).some(option => option.value === newValue)) {
        alert('Essa característica já está disponível nas opções.');
        return;
    }

    // Cria nova opção e envia ao servidor
    fetch('/add-option', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `tipo=${selectId}&nome=${newValue}`
    }).then(response => {
        if (!response.ok) {
            alert('Erro ao adicionar a nova característica.');
            return;
        }

        // Adiciona a nova opção no select
        const newOption = document.createElement('option');
        newOption.value = newValue;
        newOption.text = newValue;
        select.add(newOption);

        // Limpa o campo de texto
        input.value = '';
        alert('Nova característica adicionada com sucesso.');
    });
}
function addTextField() {
    const container = document.getElementById('dynamic-fields');
    const newTextField = document.createElement('textarea');
    newTextField.name = 'texto';
    newTextField.className = 'border rounded p-2 w-full mt-2';
    newTextField.required = true;
    container.appendChild(newTextField);
}

function autoResize(textarea) {
    // Reseta a altura para calcular corretamente a nova altura
    textarea.style.height = 'auto';
    // Define a altura com base no scrollHeight
    textarea.style.height = textarea.scrollHeight + 'px';
}

function addLinkField() {
    const container = document.getElementById('link-fields');
    const linkContainer = document.createElement('div');
    linkContainer.className = 'flex items-center border rounded p-2 w-full mt-2';

    const linkTitle = document.createElement('input');
    linkTitle.type = 'text';
    linkTitle.name = 'linkTitle';
    linkTitle.placeholder = 'Título do Link';
    linkTitle.className = 'border rounded p-2 flex-1 mr-2';
    linkTitle.required = true;

    const linkURL = document.createElement('input');
    linkURL.type = 'url';
    linkURL.name = 'linkURL';
    linkURL.placeholder = 'URL do Link';
    linkURL.className = 'border rounded p-2 flex-1 mr-2';
    linkURL.required = true;

    const removeButton = createRemoveButton(container, linkContainer);

    linkContainer.appendChild(linkTitle);
    linkContainer.appendChild(linkURL);
    linkContainer.appendChild(removeButton);
    container.appendChild(linkContainer);
}

let removedImages = [];

function removeImage(imageContainer, imageBase64) {
    // Adicionar a imagem removida ao array de imagens a serem excluídas
    removedImages.push(imageBase64);
    document.getElementById('removedImages').value = JSON.stringify(removedImages);

    // Remover visualmente a imagem do front-end
    const container = document.getElementById('image-fields');
    container.removeChild(imageContainer);
}

function addImageField() {
    const container = document.getElementById('image-fields');
    const imageFieldContainer = document.createElement('div');
    imageFieldContainer.className = 'p-2 mt-2 w-auto border rounded p-2 mr-1 image-container';

    const fileContainer = document.createElement('div');
    fileContainer.className = 'flex items-center';

    const newImageField = document.createElement('input');
    newImageField.type = 'file';
    newImageField.name = 'imagens';
    newImageField.className = 'border rounded p-2 mr-1';
    newImageField.required = true;

    newImageField.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgElement = document.createElement('img');
                imgElement.src = e.target.result;
                imgElement.className = 'w-40 h-40 object-cover mt-2 mx-auto';
                imageFieldContainer.appendChild(imgElement);
            };
            reader.readAsDataURL(file);
        }
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'bg-red-500 text-white p-2 rounded';
    removeButton.innerText = 'X';
    removeButton.onclick = function() {
        removeImage(imageFieldContainer); // Chama a função de remoção
    };

    fileContainer.appendChild(newImageField);
    fileContainer.appendChild(removeButton);
    imageFieldContainer.appendChild(fileContainer);
    container.appendChild(imageFieldContainer);
}

window.onload = function() {
    const descricao = document.getElementById('descricao');
    autoResize(descricao);
}; //carregar automaticamente a altura do campo de descricao na edição

document.querySelectorAll('.game-card').forEach(card => {
    const images = JSON.parse(card.getAttribute('data-images'));
    let currentIndex = 0;
    let interval;

    card.addEventListener('mouseenter', () => {
        interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % images.length; // Loop pelas imagens
            const imgElement = card.querySelector('img');
            imgElement.src = `data:image/jpeg;base64,${images[currentIndex]}`;
        }, 1000); // Troca a cada 1 segundo
    });

    card.addEventListener('mouseleave', () => {
        clearInterval(interval); // Para o loop ao sair do mouse
        currentIndex = 0; // Reseta o índice se desejado
        const imgElement = card.querySelector('img');
        imgElement.src = `data:image/jpeg;base64,${images[currentIndex]}`; // Retorna à primeira imagem
    });
}); //Faz com que as imagens sejam trocadas automaticamente na página inicial