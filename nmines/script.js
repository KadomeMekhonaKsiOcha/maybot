// Разворачиваем WebApp в Telegram
window.Telegram.WebApp.expand();

// Создаём сетку ячеек
const grid = document.querySelector('.grid');
for (let i = 0; i < 25; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    grid.appendChild(cell);
}

// Управление количеством ловушек
const validTraps = [2, 3, 5, 7];
let currentTrapIndex = 0;

const trapCountDisplay = document.getElementById('trap-count');
const plusButton = document.getElementById('plus-btn');
const minusButton = document.getElementById('minus-btn');

function updateTrapCountDisplay() {
    trapCountDisplay.textContent = validTraps[currentTrapIndex];
    minusButton.disabled = currentTrapIndex === 0;
    plusButton.disabled = currentTrapIndex === validTraps.length - 1;
}

plusButton.addEventListener('click', () => {
    if (currentTrapIndex < validTraps.length - 1) {
        currentTrapIndex++;
        updateTrapCountDisplay();
    }
});

minusButton.addEventListener('click', () => {
    if (currentTrapIndex > 0) {
        currentTrapIndex--;
        updateTrapCountDisplay();
    }
});

updateTrapCountDisplay();

// Таблица соответствия количества ловушек и безопасных ячеек
const safeCellsMapping = {
    2: [9, 11],
    3: [6, 8],
    5: [4, 6],
    7: [2, 4]
};

// Функция для выбора случайного количества безопасных ячеек
function getRandomSafeCells(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Добавление звука при открытии ячеек
const soundEffect = new Audio('1.mp3');

function resetCells() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.backgroundImage = "url('./cell.jpg')";
        cell.classList.remove('active');
    });
}

// Последовательное открытие безопасных ячеек
function openSafeCells() {
    const bombs = validTraps[currentTrapIndex];
    const [min, max] = safeCellsMapping[bombs];
    const safeCellsCount = getRandomSafeCells(min, max);

    if (!safeCellsCount) {
        alert('Пожалуйста, выберите корректное количество бомб!');
        return;
    }

    resetCells();

    const cells = Array.from(document.querySelectorAll('.cell'));
    const selectedIndices = new Set();

    while (selectedIndices.size < safeCellsCount) {
        const randomIndex = Math.floor(Math.random() * cells.length);
        selectedIndices.add(randomIndex);
    }

    let delay = 0;
    selectedIndices.forEach(index => {
        setTimeout(() => {
            const cell = cells[index];
            cell.style.backgroundImage = "url('./active.jpg')";
            cell.classList.add('active');
            soundEffect.currentTime = 0;
            soundEffect.play();
        }, delay);
        delay += 700;
    });
}

// Ограничение нажатий на кнопку
const highlightButton = document.getElementById('highlight-btn');
let isCooldown = false;

highlightButton.addEventListener('click', () => {
    if (isCooldown) {
        alert('Пожалуйста, подождите 7 секунд перед повторным сигналом.');
        return;
    }

    isCooldown = true; // Устанавливаем блокировку
    openSafeCells(); // Выполняем основную функцию

    // Устанавливаем таймер для снятия блокировки
    setTimeout(() => {
        isCooldown = false; // Снимаем блокировку
    }, 100); // 7 секунд
});

// Добавление анимации снега
const snowContainer = document.querySelector('.snow');

// Убедимся, что контейнер для снега существует
if (snowContainer) {
    for (let i = 0; i < 80; i++) {
        const snowflake = document.createElement('div');
        snowflake.classList.add('snowflake');
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.animationDuration = Math.random() * 3 + 2 + 's'; // От 2 до 5 секунд
        snowflake.style.animationDelay = Math.random() * 5 + 's'; // Задержка перед началом
        snowflake.style.width = snowflake.style.height = Math.random() * 10 + 5 + 'px'; // Размер от 5 до 15px
        snowContainer.appendChild(snowflake);
    }
} else {
    console.error('Snow container not found. Please ensure the .snow element exists in your HTML.');
}

// Управление модальным окном
const modal = document.getElementById('modal');
const closeModal = document.querySelector('.close');
const numButtons = document.querySelectorAll('.num-button');

closeModal?.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

numButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const value = event.target.getAttribute('data-value');
        trapCountDisplay.textContent = value;
        currentTrapIndex = validTraps.indexOf(parseInt(value, 10));
        modal.style.display = 'none';
        updateTrapCountDisplay();
    });
});