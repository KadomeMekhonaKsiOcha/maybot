document.addEventListener('DOMContentLoaded', () => {

    // ── DOM refs ────────────────────────────────────────────────
    const langIcon     = document.getElementById('language-icon');
    const langDropdown = document.getElementById('language-dropdown');
    const langOptions  = document.querySelectorAll('.language-option');
    const statusEl     = document.getElementById('status');
    const accuracyEl   = document.getElementById('signal-accuracy');
    const floorsEl     = document.getElementById('floors');
    const flipBtn      = document.getElementById('flip');
    const countdownEl  = document.getElementById('countdown');
    const progressBar  = document.getElementById('progress-bar');
    const diffLabel    = document.getElementById('diff-label');
    const diffPrev     = document.getElementById('diff-prev');
    const diffNext     = document.getElementById('diff-next');
    const craneImg     = document.getElementById('crane-img');

    // ── Tower Rush multiplier tables (Galaxsys) ─────────────────
    // Each index = floor number (0-based), value = multiplier at that floor
    const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'LEGEND'];

    const MULTS = {
        // ~1 bomb per 6 tiles, 18 floors
        EASY: [
            1.06, 1.13, 1.21, 1.30, 1.41, 1.54, 1.68, 1.85,
            2.04, 2.28, 2.57, 2.93, 3.38, 3.96, 4.72, 5.76,
            7.22, 9.55
        ],
        // ~1 bomb per 4 tiles, 14 floors
        MEDIUM: [
            1.19, 1.44, 1.76, 2.17, 2.70, 3.40, 4.32, 5.56,
            7.25, 9.60, 13.00, 18.20, 26.50, 41.00
        ],
        // ~1 bomb per 3 tiles, 11 floors
        HARD: [
            1.44, 2.13, 3.22, 4.96, 7.82, 12.70, 21.20, 36.50,
            65.00, 122.00, 245.00
        ],
        // ~1 bomb per 2 tiles, 8 floors
        LEGEND: [
            1.92, 3.84, 7.70, 15.60, 32.00, 68.00, 152.00, 370.00
        ],
    };

    const TOTAL_FLOORS = 8;
    const COOLDOWN_SEC = 10;

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
            flip:      'Получить сигнал',
            wait:      'АНАЛИЗ...',
            accuracy:  'Точность сигнала:',
            countdown: 'Осталось:',
            sec:       'сек',
            cashout:   'КЭШАУТ ЭТАЖ',
            idle:      '— —',
            floor:     'ЭТ.',
        },
        en: {
            flip:      'Get Signal',
            wait:      'ANALYZING...',
            accuracy:  'Signal accuracy:',
            countdown: 'Remaining:',
            sec:       'sec',
            cashout:   'CASH OUT FLOOR',
            idle:      '— —',
            floor:     'FL.',
        },
        hi: {
            flip:      'सिग्नल प्राप्त करें',
            wait:      'विश्लेषण...',
            accuracy:  'सिग्नल सटीकता:',
            countdown: 'वाम:',
            sec:       'सेक',
            cashout:   'मंज़िल पर कैशआउट',
            idle:      '— —',
            floor:     'मं.',
        },
        pt: {
            flip:      'Receber sinal',
            wait:      'AGUARDE...',
            accuracy:  'Precisão do sinal:',
            countdown: 'Restante:',
            sec:       'seg',
            cashout:   'SAÍDA ANDAR',
            idle:      '— —',
            floor:     'AN.',
        },
        es: {
            flip:      'Recibir señal',
            wait:      'ANALIZANDO...',
            accuracy:  'Precisión de señal:',
            countdown: 'Restante:',
            sec:       'seg',
            cashout:   'SALIDA PISO',
            idle:      '— —',
            floor:     'P.',
        },
        tr: {
            flip:      'Sinyal al',
            wait:      'ANALİZ...',
            accuracy:  'Sinyal doğruluğu:',
            countdown: 'Kaldı:',
            sec:       'sn',
            cashout:   'ÇIKIŞ KAT',
            idle:      '— —',
            floor:     'K.',
        },
    };

    // ── Build 8 empty floor tiles (floor 1 at bottom via flex-direction: column-reverse) ──
    const floorTiles = [];
    for (let i = 0; i < TOTAL_FLOORS; i++) {
        const div = document.createElement('div');
        div.classList.add('floor');

        const num = document.createElement('span');
        num.classList.add('floor-num');
        num.textContent = (i + 1); // floor number label

        const mult = document.createElement('span');
        mult.classList.add('floor-mult');

        div.appendChild(num);
        div.appendChild(mult);
        floorsEl.appendChild(div);
        floorTiles.push(div);
    }
    // floorTiles[0] = floor 1 (DOM renders at bottom), floorTiles[7] = floor 8 (top)

    // ── Helpers ─────────────────────────────────────────────────
    function currentDiff() { return DIFFICULTIES[diffIndex]; }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function fmtMult(v) {
        if (v >= 1000) return (v / 1000).toFixed(1) + 'Kx';
        if (v >= 100)  return Math.round(v) + 'x';
        if (v >= 10)   return v.toFixed(1) + 'x';
        return v.toFixed(2) + 'x';
    }

    function resetFloors() {
        floorTiles.forEach((t, i) => {
            t.className = 'floor';
            const num = t.querySelector('.floor-num');
            const mult = t.querySelector('.floor-mult');
            if (num) num.textContent = (i + 1);
            if (mult) { mult.textContent = ''; mult.style.opacity = '0'; }
        });
    }

    // ── Weighted cashout picker ─────────────────────────────────
    // Distribution tuned for Tower Rush: lower floors more common (volatile game)
    //   30% early  (floors 1–2)
    //   40% mid    (floors 3–5)
    //   22% good   (floors 5–7)
    //   8%  high   (top floors)
    function pickCashoutIdx(totalFloors) {
        const r = Math.random();
        let lo, hi;
        if (r < 0.30) {
            lo = 0;
            hi = Math.max(0, Math.floor(totalFloors * 0.25) - 1);
        } else if (r < 0.70) {
            lo = Math.floor(totalFloors * 0.20);
            hi = Math.floor(totalFloors * 0.58);
        } else if (r < 0.92) {
            lo = Math.floor(totalFloors * 0.45);
            hi = Math.floor(totalFloors * 0.80);
        } else {
            lo = Math.floor(totalFloors * 0.72);
            hi = totalFloors - 1;
        }
        lo = Math.min(lo, totalFloors - 1);
        hi = Math.min(hi, totalFloors - 1);
        if (lo > hi) lo = hi;
        return randInt(lo, hi);
    }

    // ── Signal reveal ───────────────────────────────────────────
    function revealSignal() {
        const diff   = currentDiff();
        const mults  = MULTS[diff];
        const total  = mults.length;

        // 1. Pick cashout floor in the full multiplier table
        const cashoutGlobal = pickCashoutIdx(total);

        // 2. Safe floors to show below cashout (1–3)
        const safeBefore = Math.min(cashoutGlobal, randInt(1, 3));

        // 3. Display window: cashout at position safeBefore in the 8 tiles
        const displayStart = Math.min(
            Math.max(0, cashoutGlobal - safeBefore),
            Math.max(0, total - TOTAL_FLOORS)
        );
        const cashoutPos = cashoutGlobal - displayStart; // 0-based in visible tiles

        const accuracy = randInt(85, 97);
        const t = T[lang];
        accuracyEl.textContent = `${t.accuracy} ${accuracy}%`;

        const STEP_MS = 200;
        let delay = 0;

        // Reveal bottom-to-top: floorTiles[0]=floor1 first, floorTiles[7]=floor8 last
        for (let i = 0; i < TOTAL_FLOORS; i++) {
            ((pos) => {
                setTimeout(() => {
                    const globalIdx = displayStart + pos;
                    const mult = mults[globalIdx];
                    const tile = floorTiles[pos];
                    const numEl  = tile.querySelector('.floor-num');
                    const multEl = tile.querySelector('.floor-mult');

                    if (pos < cashoutPos) {
                        // Safe floor
                        tile.className = 'floor safe reveal';
                        numEl.textContent  = `${t.floor}${globalIdx + 1}`;
                        multEl.textContent = fmtMult(mult);
                        multEl.style.opacity = '1';
                    } else if (pos === cashoutPos) {
                        // Cashout floor
                        tile.className = 'floor cashout reveal';
                        numEl.textContent  = `${t.floor}${globalIdx + 1}`;
                        multEl.textContent = fmtMult(mult);
                        multEl.style.opacity = '1';

                        statusEl.textContent = `${t.cashout} ${globalIdx + 1} — ${fmtMult(mult)}`;

                        craneImg.classList.add('excited');
                        setTimeout(() => craneImg.classList.remove('excited'), 1400);
                    } else {
                        // Danger floor
                        tile.className = 'floor danger reveal';
                        numEl.textContent  = `${t.floor}${globalIdx + 1}`;
                        if (multEl) multEl.textContent = '';
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

        resetFloors();

        setTimeout(revealSignal, 1200);
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
    statusEl.textContent   = T[lang].idle;
    accuracyEl.textContent = '—';
});
