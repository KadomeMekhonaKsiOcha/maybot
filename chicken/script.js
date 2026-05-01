document.addEventListener('DOMContentLoaded', () => {

    // ── DOM refs ────────────────────────────────────────────────
    const langIcon      = document.getElementById('language-icon');
    const langDropdown  = document.getElementById('language-dropdown');
    const langOptions   = document.querySelectorAll('.language-option');
    const statusEl      = document.getElementById('status');
    const accuracyEl    = document.getElementById('signal-accuracy');
    const tilesEl       = document.getElementById('tiles');
    const flipBtn       = document.getElementById('flip');
    const countdownEl   = document.getElementById('countdown');
    const progressBar   = document.getElementById('progress-bar');
    const diffLabel     = document.getElementById('diff-label');
    const diffPrev      = document.getElementById('diff-prev');
    const diffNext      = document.getElementById('diff-next');
    const chickenImg    = document.getElementById('chicken-img');

    // ── Real Chicken Road multiplier tables (by InOut Games) ────
    const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'HC'];

    const MULTS = {
        EASY: [
            1.03, 1.07, 1.12, 1.17, 1.23, 1.29, 1.36, 1.44,
            1.53, 1.63, 1.75, 1.88, 2.04, 2.22, 2.45, 2.72,
            3.06, 3.50, 4.08, 4.90, 6.13, 6.61, 9.81, 19.44,
        ],
        MEDIUM: [
            1.12, 1.28, 1.47, 1.70, 1.98, 2.33, 2.76, 3.32,
            4.03, 4.96, 6.20, 6.91, 8.90, 11.74, 15.99, 22.61,
            33.58, 53.20, 92.17, 182.51, 451.71, 1788.80,
        ],
        HARD: [
            1.23, 1.55, 1.98, 2.56, 3.36, 4.49, 5.49, 7.53,
            10.56, 15.21, 22.59, 34.79, 55.97, 94.99, 172.42,
            341.40, 760.46, 2007.63, 6957.47, 41321.43,
        ],
        HC: [
            1.63, 2.80, 4.95, 9.08, 15.21, 30.12, 62.96, 140.24,
            337.19, 890.19, 2643.89, 9161.08, 39301.05, 233448.29, 2542251.93,
        ],
    };

    const TOTAL_TILES = 8;
    const COOLDOWN_SEC  = 10;

    // ── State ───────────────────────────────────────────────────
    let lang        = 'ru';
    let dropOpen    = false;
    let isCooldown  = false;
    let isAnalyzing = false;
    let diffIndex   = 1; // default MEDIUM
    let cooldownEnd = null;

    // ── Translations ────────────────────────────────────────────
    const T = {
        ru: {
            flip:     'Получить сигнал',
            wait:     'АНАЛИЗ...',
            accuracy: 'Точность сигнала:',
            countdown:'Осталось:',
            sec:      'сек',
            cashout:  'КЭШАУТ НА',
            idle:     '— —',
        },
        en: {
            flip:     'Get Signal',
            wait:     'ANALYZING...',
            accuracy: 'Signal accuracy:',
            countdown:'Remaining:',
            sec:      'sec',
            cashout:  'CASH OUT AT',
            idle:     '— —',
        },
        hi: {
            flip:     'सिग्नल प्राप्त करें',
            wait:     'विश्लेषण...',
            accuracy: 'सिग्नल सटीकता:',
            countdown:'वाम:',
            sec:      'सेक',
            cashout:  'पर कैशआउट',
            idle:     '— —',
        },
        pt: {
            flip:     'Receber sinal',
            wait:     'AGUARDE...',
            accuracy: 'Precisão do sinal:',
            countdown:'Restante:',
            sec:      'seg',
            cashout:  'CAIXA EM',
            idle:     '— —',
        },
        es: {
            flip:     'Recibir señal',
            wait:     'ANALIZANDO...',
            accuracy: 'Precisión de señal:',
            countdown:'Restante:',
            sec:      'seg',
            cashout:  'RETIRO EN',
            idle:     '— —',
        },
        tr: {
            flip:     'Sinyal al',
            wait:     'ANALİZ...',
            accuracy: 'Sinyal doğruluğu:',
            countdown:'Kaldı:',
            sec:      'sn',
            cashout:  'ÇIKIŞ:',
            idle:     '— —',
        },
    };

    // ── Build 7 empty tiles ─────────────────────────────────────
    const tiles = [];
    for (let i = 0; i < TOTAL_TILES; i++) {
        const div = document.createElement('div');
        div.classList.add('tile');
        const num = document.createElement('span');
        num.classList.add('step-num');
        num.textContent = i + 1;
        div.appendChild(num);
        tilesEl.appendChild(div);
        tiles.push(div);
    }

    // ── Helpers ─────────────────────────────────────────────────
    function currentDiff() { return DIFFICULTIES[diffIndex]; }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function fmtMult(v) {
        if (v >= 1000000) return (v / 1000000).toFixed(1) + 'Mx';
        if (v >= 1000)    return (v / 1000).toFixed(1) + 'Kx';
        if (v >= 100)     return Math.round(v) + 'x';
        if (v >= 10)      return v.toFixed(1) + 'x';
        return v.toFixed(2) + 'x';
    }

    function resetTiles() {
        tiles.forEach((t, i) => {
            t.className = 'tile';
            t.innerHTML = '';
            const num = document.createElement('span');
            num.classList.add('step-num');
            num.textContent = i + 1;
            t.appendChild(num);
        });
    }

    // ── Weighted cashout picker ─────────────────────────────────
    // Picks a global multiplier index from the full table with weighted distribution:
    //   25% early  (small kefs, first quarter)
    //   35% mid    (medium kefs)
    //   25% late   (good kefs)
    //   15% big    (rare but exciting high kefs)
    function pickCashoutIdx(totalSteps) {
        const r = Math.random();
        let lo, hi;
        if (r < 0.25) {
            lo = 0;
            hi = Math.max(0, Math.floor(totalSteps * 0.25) - 1);
        } else if (r < 0.60) {
            lo = Math.floor(totalSteps * 0.20);
            hi = Math.floor(totalSteps * 0.55);
        } else if (r < 0.85) {
            lo = Math.floor(totalSteps * 0.48);
            hi = Math.floor(totalSteps * 0.78);
        } else {
            lo = Math.floor(totalSteps * 0.68);
            hi = totalSteps - 1;
        }
        // Clamp so cashout always exists in the table
        lo = Math.min(lo, totalSteps - 1);
        hi = Math.min(hi, totalSteps - 1);
        if (lo > hi) lo = hi;
        return randInt(lo, hi);
    }

    // ── Signal reveal ───────────────────────────────────────────
    function revealSignal() {
        const diff      = currentDiff();
        const mults     = MULTS[diff];
        const total     = mults.length;

        // 1. Pick the cashout position in the full multiplier table
        const cashoutGlobal = pickCashoutIdx(total);

        // 2. How many safe tiles to show before cashout (1–3, but clamped)
        const safeBefore = Math.min(cashoutGlobal, randInt(1, 3));

        // 3. Display window: try to put cashout at position safeBefore in the 8 tiles
        const displayStart = Math.min(
            Math.max(0, cashoutGlobal - safeBefore),
            Math.max(0, total - TOTAL_TILES)
        );
        const cashoutPos = cashoutGlobal - displayStart; // 0-based within visible tiles

        const accuracy = randInt(86, 97);
        const t = T[lang];
        accuracyEl.textContent = `${t.accuracy} ${accuracy}%`;

        const STEP_MS = 220;
        let delay = 0;

        for (let i = 0; i < TOTAL_TILES; i++) {
            ((pos) => {
                setTimeout(() => {
                    const globalIdx = displayStart + pos;
                    const mult = mults[globalIdx];

                    if (pos < cashoutPos) {
                        // Safe tile
                        tiles[pos].className = 'tile safe reveal';
                        tiles[pos].innerHTML = fmtMult(mult);
                    } else if (pos === cashoutPos) {
                        // Cashout tile
                        tiles[pos].className = 'tile cashout reveal';
                        tiles[pos].innerHTML = fmtMult(mult);

                        statusEl.textContent = `${t.cashout} ${fmtMult(mult)}`;

                        chickenImg.classList.add('excited');
                        setTimeout(() => chickenImg.classList.remove('excited'), 1200);
                    } else {
                        // Danger tile
                        tiles[pos].className = 'tile danger reveal';
                        tiles[pos].innerHTML = '';
                    }
                }, delay);
            })(i);
            delay += STEP_MS;
        }

        setTimeout(() => { isAnalyzing = false; }, delay);
        startCountdown();
    }

    // ── Countdown ───────────────────────────────────────────────
    function tickCountdown() {
        const t   = T[lang];
        const rem = Math.max(0, cooldownEnd - Date.now());
        const sec = Math.ceil(rem / 1000);

        if (rem > 0) {
            progressBar.style.width = `${(rem / (COOLDOWN_SEC * 1000)) * 100}%`;
            countdownEl.textContent = `${t.countdown} ${sec} ${t.sec}`;
            flipBtn.disabled = true;
            isCooldown = true;
            requestAnimationFrame(tickCountdown);
        } else {
            progressBar.style.width = '0%';
            countdownEl.textContent = `${t.countdown} 0 ${t.sec}`;
            flipBtn.disabled = false;
            isCooldown = false;
        }
    }

    function startCountdown() {
        cooldownEnd = Date.now() + COOLDOWN_SEC * 1000;
        isCooldown  = true;
        flipBtn.disabled = true;
        requestAnimationFrame(tickCountdown);
    }

    // ── Signal button ────────────────────────────────────────────
    flipBtn.addEventListener('click', () => {
        if (isCooldown || isAnalyzing) return;

        isAnalyzing = true;
        flipBtn.disabled = true;
        statusEl.textContent = T[lang].wait;
        accuracyEl.textContent = '—';

        resetTiles();

        setTimeout(revealSignal, 1300);
    });

    // ── Difficulty controls ──────────────────────────────────────
    function updateDiffUI() {
        diffLabel.textContent = DIFFICULTIES[diffIndex];
        diffPrev.disabled = (diffIndex === 0);
        diffNext.disabled = (diffIndex === DIFFICULTIES.length - 1);
    }

    diffPrev.addEventListener('click', () => {
        if (isCooldown || isAnalyzing || diffIndex === 0) return;
        diffIndex--;
        updateDiffUI();
    });

    diffNext.addEventListener('click', () => {
        if (isCooldown || isAnalyzing || diffIndex === DIFFICULTIES.length - 1) return;
        diffIndex++;
        updateDiffUI();
    });

    // ── Language selector ────────────────────────────────────────
    function toggleDropdown() {
        dropOpen = !dropOpen;
        langDropdown.style.display = dropOpen ? 'grid' : 'none';
    }

    function applyLang() {
        const t = T[lang];
        flipBtn.textContent = flipBtn.disabled ? t.wait : t.flip;
        if (!isAnalyzing && !isCooldown) {
            countdownEl.textContent = `${t.countdown} 0 ${t.sec}`;
        }
    }

    langIcon.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(); });

    langOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            if (T[opt.dataset.lang]) {
                langIcon.src = opt.src;
                lang = opt.dataset.lang;
                applyLang();
                toggleDropdown();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (dropOpen && !langDropdown.contains(e.target) && e.target !== langIcon) {
            toggleDropdown();
        }
    });

    // ── Init ─────────────────────────────────────────────────────
    updateDiffUI();
    applyLang();
    statusEl.textContent  = T[lang].idle;
    accuracyEl.textContent = '—';
});
