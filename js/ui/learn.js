/* =============================================================
   learn.js — Controlador Principal y Estado Global
   ============================================================= */

/* ── Estado global ── */
var currentCase  = 'upper';
var letterOrder  = Object.keys(LETTERS_UPPER);
var currentIndex = 0;
var demoPlaying  = false;
var demoTimer    = null;
var letterTimer  = null; 

// Estado de gamificación
var starsEarned = 0;
var letterCompleted = false;

// Estado de trazado
var userStrokes = [];
var crayonColors = ['#FF4B4B', '#FFB300', '#00E676', '#2979FF', '#D500F9', '#FF6D00'];
var currentTraceColor = crayonColors[0];
var patternCache = {};
var drawing  = false;
var hasDrawn = false;

/* ── Referencias DOM Principales ── */
var instrEl  = document.getElementById('instruction');
var letterEl = document.getElementById('currentLetter');

/* ── Obtener trazos de la letra actual ── */
function currentStrokes() {
    var set  = currentCase === 'upper' ? LETTERS_UPPER : LETTERS_LOWER;
    var keys = Object.keys(set);
    return set[keys[currentIndex]];
}

function currentLetterChar() {
    var set  = currentCase === 'upper' ? LETTERS_UPPER : LETTERS_LOWER;
    return Object.keys(set)[currentIndex];
}

/* ── Celebración ── */
function celebrate() {
    // Sonido de victoria y lluvia de confeti
    if (typeof SFX !== 'undefined') SFX.playDing();
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#FF4B4B', '#FFB300', '#00E676', '#2979FF', '#D500F9']
        });
    }

    // Sumar estrellita
    starsEarned++;
    var counterEl = document.getElementById('starsCounter');
    if (counterEl) counterEl.innerHTML = '<i class="ph-fill ph-star"></i> ' + starsEarned;

    instrEl.innerHTML = '¡Muy bien! <i class="ph-bold ph-confetti"></i>';
    instrEl.className   = 'instruction success';
    
    // Animación de estrellita original de la interfaz
    var el = document.createElement('div');
    el.className = 'celebrate';
    el.innerHTML = '<i class="ph-fill ph-star"></i>';
    document.body.appendChild(el);
    setTimeout(function() {
        if (el.parentNode) el.parentNode.removeChild(el);
    }, 1600);
}

/* ── Navegación ── */
function loadLetter() {
    if (typeof stopDemo === 'function') stopDemo();
    if (typeof dCtx !== 'undefined') {
        dCtx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
        tCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
    }
    userStrokes  = [];
    letterCompleted = false;
    currentTraceColor = crayonColors[Math.floor(Math.random() * crayonColors.length)];
    hasDrawn     = false;
    demoPlaying  = false;
    var char     = currentLetterChar();
    
    if (letterEl) letterEl.textContent = char;
    if (instrEl) {
        instrEl.textContent  = 'Primero mira cómo se hace';
        instrEl.className    = 'instruction';
    }
    if (typeof drawGuide === 'function') drawGuide();
    
    if (letterTimer) clearTimeout(letterTimer);
    letterTimer = setTimeout(function() {
        if (typeof speakText === 'function') speakText(char);
        if (typeof playDemo === 'function') playDemo();
    }, 400);
}

function nextLetter() {
    var keys = Object.keys(currentCase === 'upper' ? LETTERS_UPPER : LETTERS_LOWER);
    currentIndex = (currentIndex + 1) % keys.length;
    loadLetter();
}

function prevLetter() {
    var keys = Object.keys(currentCase === 'upper' ? LETTERS_UPPER : LETTERS_LOWER);
    currentIndex = (currentIndex - 1 + keys.length) % keys.length;
    loadLetter();
}

function setCase(c) {
    currentCase  = c;
    currentIndex = 0;
    document.getElementById('btn-upper').className = c === 'upper' ? 'active' : '';
    document.getElementById('btn-lower').className = c === 'lower' ? 'active' : '';
    loadLetter();
}

/* ── Alternar modo expandido ── */
function toggleExpand() {
    document.body.classList.toggle('expanded-mode');
    const btn = document.getElementById('btn-expand');
    if (document.body.classList.contains('expanded-mode')) {
        btn.innerHTML = '<i class="ph-bold ph-corners-in"></i>'; 
        btn.title = 'Contraer área';
    } else {
        btn.innerHTML = '<i class="ph-bold ph-corners-out"></i>';
        btn.title = 'Ampliar área';
    }
    if (typeof resizeCanvases === 'function') resizeCanvases();
}

/* ── Inicio ── */
if (typeof resizeCanvases === 'function') resizeCanvases();
loadLetter();
