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

function addImageField() {
    const container = document.getElementById('image-fields');

    const imageFieldContainer = document.createElement('div');
    imageFieldContainer.className = 'p-2 mt-2 w-auto';

    const fileContainer = document.createElement('div');

    const newImageField = document.createElement('input');
    newImageField.type = 'file';
    newImageField.name = 'imagens';
    newImageField.className = 'border rounded p-2 mr-1';
    newImageField.required = true;

    const removeButton = createRemoveButton(container, imageFieldContainer);

    fileContainer.appendChild(newImageField);
    fileContainer.appendChild(removeButton);

    imageFieldContainer.appendChild(fileContainer);
    container.appendChild(imageFieldContainer);
}
window.onload = function() {
    const descricao = document.getElementById('descricao');
    autoResize(descricao);
};