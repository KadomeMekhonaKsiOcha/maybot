const getSignal = document.getElementById("get-signal");
const stopSignalTimeBlock = document.getElementById("stop-signal-time-block");
const printSignal = document.getElementById("print-signal");
const stopProgress = document.getElementById("stop-progress");

// Статические значения для минимального и максимального коэффициентов
const MIN_COEFFICIENT = 1.30; 
const MAX_COEFFICIENT = 3.50;

// Функция для генерации случайного числа
function getRandomFloat(min, max, decimals) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

getSignal.onclick = function () {
  // Генерируем случайный коэффициент в диапазоне от MIN_COEFFICIENT до MAX_COEFFICIENT
  let receivingSignal = getRandomFloat(MIN_COEFFICIENT, MAX_COEFFICIENT, 2);

  // Форматируем сигнал
  receivingSignal = receivingSignal.toFixed(2); // Устанавливаем фиксированное количество знаков после запятой

  // Отображаем сгенерированный сигнал
  printSignal.innerHTML = `${receivingSignal}x`;
  printSignal.classList.remove("deactivate");

  // Запускаем таймер
  goTimer(15);

  // Деактивируем кнопку
  getSignal.disabled = true;
};

// Таймер после получения сигнала
function goTimer(time) {
  const timer = setInterval(() => {
    if (time >= 1) {
      getSignal.classList.add("deactivate");
      getSignal.style.zIndex = "-1";
      stopProgress.style.animation = "animateProgress 15s linear infinite";
      stopSignalTimeBlock.classList.remove("deactivate");

      let stopTimer = document.getElementById("stop-timer");
      stopTimer.innerHTML = `${time--}<span> seconds</span>`;
    } else {
      getSignal.classList.remove("deactivate");
      getSignal.style.zIndex = "5";
      stopSignalTimeBlock.classList.add("deactivate");
      stopProgress.style.animation = "none";
      clearInterval(timer);
      getSignal.disabled = false;
    }
  }, 1000);
}
