//botão de remoção de item
function createRemoveButton(container, element) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'bg-red-500 text-white font-bold rounded px-3 py-1 ml-2';
    removeButton.innerText = 'X';
    removeButton.onclick = () => container.removeChild(element);
    return removeButton;
}

//função do botão de incluir característica
function addOptionField(selectId, containerId) {
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
function adicionarCaracteristica() {
    const input = document.getElementById('newCaracteristica');
    const selectTipo = document.getElementById('tipoCaracteristica');

    const newValue = input.value.trim();
    const tipo = selectTipo.value;

    if (!newValue) {
        alert('Digite uma nova característica válida.');
        return;
    }

    if (!tipo) {
        alert('Selecione um tipo de característica.');
        return;
    }

    // Envia ao servidor
    fetch('/add-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `tipo=${encodeURIComponent(tipo)}&nome=${encodeURIComponent(newValue)}`
    })
    .then(response => response.json()) // Converte a resposta para JSON
    .then(data => {
        if (!data.success) {
            alert(`Erro: ${data.message}`);
            return;
        }

        // Adiciona a nova característica na tabela sem recarregar
        const tabela = document.querySelector("tbody");
        const novaLinha = document.createElement("tr");
        novaLinha.classList.add("text-center", "border");

        novaLinha.innerHTML = `
            <td class="p-2 border">${newValue}</td>
            <td class="p-2 border capitalize">${tipo}</td>
            <td class="p-2 border flex justify-center space-x-2">
                <!-- Editar -->
                <form action="/admin/caracteristicas/salvar" method="POST" class="flex space-x-2">
                    <input type="hidden" name="acao" value="editar">
                    <input type="hidden" name="id" value="${data.id}"> <!-- ID retornado pela API -->
                    <input type="text" name="nome" value="${newValue}" class="p-1 border rounded w-1/3">
                    <select name="tipo" class="p-1 border rounded w-1/3">
                        <option value="plataforma" ${tipo === 'plataforma' ? 'selected' : ''}>Plataforma</option>
                        <option value="categoria" ${tipo === 'categoria' ? 'selected' : ''}>Categoria</option>
                        <option value="conhecimento" ${tipo === 'conhecimento' ? 'selected' : ''}>Conhecimento</option>
                        <option value="idioma" ${tipo === 'idioma' ? 'selected' : ''}>Idioma</option>
                    </select>
                    <button type="submit" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Salvar</button>
                </form>

                <!-- Excluir -->
                <form action="/admin/caracteristicas/salvar" method="POST">
                    <input type="hidden" name="acao" value="excluir">
                    <input type="hidden" name="id" value="${data.id}">
                    <button type="submit" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Excluir</button>
                </form>
            </td>
        `;

        tabela.appendChild(novaLinha);

        // Limpa os campos
        input.value = '';
        alert('Nova característica adicionada com sucesso.');
    })
    .catch(err => {
        alert('Erro ao adicionar a característica.');
        console.error(err);
    });
}


//função do botão de criar nova característica
function addNewOption(selectId, inputId, containerId) {
    const input = document.getElementById(inputId);
    const newValue = input.value.trim();

    if (!newValue) {
        alert('Digite uma nova característica válida.');
        return;
    }

    //verifica duplicatas no select
    const select = document.getElementById(selectId);
    if (Array.from(select.options).some(option => option.value === newValue)) {
        alert('Essa característica já está disponível nas opções.');
        return;
    }

    //cria nova opção e envia ao servidor
    fetch('/add-option', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `tipo=${selectId}&nome=${newValue}`
    }).then(response => {
        if (!response.ok) {
            alert('Erro ao adicionar a nova característica.'+response,);
            return;
        }

        //adiciona a nova opção no select
        const newOption = document.createElement('option');
        newOption.value = newValue;
        newOption.text = newValue;
        select.add(newOption);

        //limpa o campo de texto
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
    //reseta a altura para calcular corretamente a nova altura
    textarea.style.height = 'auto';
    //define a altura com base no scrollHeight
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

let removedItems = {
    images: [],
    platforms: [],
    categories: [],
    developers: [],
    links: []
};

function removeItem(type, container, itemValue) {
    //adiciona o item removido ao array correspondente no objeto removedItems
    switch (type) {
        case 'image-fields':
            removedItems.images.push(itemValue);
            document.getElementById('removedImages').value = JSON.stringify(removedItems.images);
            break;
        case 'plataformas-container':
            removedItems.platforms.push(itemValue);
            document.getElementById('removedPlataformas').value = JSON.stringify(removedItems.platforms);
            break;
        case 'categorias-container':
            removedItems.categories.push(itemValue);
            document.getElementById('removedCategorias').value = JSON.stringify(removedItems.categories);
            break;
        case 'conhecimentos-container':
            removedItems.developers.push(itemValue);
            document.getElementById('removedConhecimentos').value = JSON.stringify(removedItems.developers);
            break;
        case 'link-fields':
            removedItems.links.push(itemValue);
            document.getElementById('removedLinks').value = JSON.stringify(removedItems.links);
            break;
    }

    //remover visualmente o item do front-end
    const parentContainer = document.getElementById(type);
    parentContainer.removeChild(container);
}
function hideImage() {
    // esconde a imagem quando um novo arquivo é selecionado
    var image = document.getElementById("imagemCapaPreview");
    if (image) {
        image.style.display = "none";
    }
}
function previewImage(fileInput, container) {
    const file = fileInput.files[0]; // Obtém o arquivo do input
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Remove a imagem anterior, se existir
            let existingImage = container.querySelector('.preview-image');
            if (existingImage) {
                existingImage.remove();
            }

            // Cria o elemento de imagem para pré-visualização
            const imgElement = document.createElement('img');
            imgElement.src = e.target.result;
            imgElement.className = 'preview-image w-80 h-60 object-cover rounded mt-2 mx-auto';
            imgElement.style.display = 'block'; // Faz a imagem se comportar como bloco

            // Adiciona a nova imagem ao contêiner
            container.appendChild(imgElement);
        };
        reader.readAsDataURL(file); // Lê o arquivo como DataURL
    }
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

    newImageField.addEventListener('change', function() {
        previewImage(newImageField, imageFieldContainer); // Chama a função de pré-visualização
    });

    const removeButton = createRemoveButton(container, imageFieldContainer);

    fileContainer.appendChild(newImageField);
    fileContainer.appendChild(removeButton);
    imageFieldContainer.appendChild(fileContainer);
    container.appendChild(imageFieldContainer);
}

document.getElementById('imagemCapa').addEventListener('change', function() {
    const container = this.parentElement; // Contêiner onde a imagem será inserida
    previewImage(this, container);
});

window.onload = function() {
    const descricao = document.getElementById('descricao');
    autoResize(descricao);
}; //carregar automaticamente a altura do campo de descricao na edição
