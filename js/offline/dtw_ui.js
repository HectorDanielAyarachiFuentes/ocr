/* ============================================================
   dtw_ui.js — Integración UI del motor DTW offline
   Conecta dtwRecognize() (dtw_bridge.js) con la interfaz de
   app.js sin tocar transformers.js.
   ============================================================ */

/* ============================================================
   BARRA DE CONFIANZA — indicador visual del nivel de certeza
   ============================================================ */

var _dtwConfidenceBar = null;
var _dtwConfidenceLabel = null;

function _ensureConfidenceWidget() {
    if (_dtwConfidenceBar) return;

    /* Crear contenedor de confianza bajo el área de resultado */
    var resultArea = document.querySelector('.result-area');
    if (!resultArea) return;

    var wrapper = document.createElement('div');
    wrapper.id = 'dtw-confidence-wrapper';
    wrapper.style.cssText = [
        'display:none',
        'flex-direction:column',
        'align-items:center',
        'gap:4px',
        'margin-top:8px',
        'width:100%',
        'max-width:260px',
        'margin-left:auto',
        'margin-right:auto'
    ].join(';');

    var labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex;justify-content:space-between;width:100%;font-size:0.72rem;color:#aaa;font-family:inherit';

    var labelLeft = document.createElement('span');
    labelLeft.textContent = '🧠 Confianza DTW';

    _dtwConfidenceLabel = document.createElement('span');
    _dtwConfidenceLabel.id = 'dtw-confidence-pct';
    _dtwConfidenceLabel.textContent = '0%';

    labelRow.appendChild(labelLeft);
    labelRow.appendChild(_dtwConfidenceLabel);

    var track = document.createElement('div');
    track.style.cssText = [
        'width:100%',
        'height:6px',
        'background:rgba(255,255,255,0.1)',
        'border-radius:99px',
        'overflow:hidden'
    ].join(';');

    _dtwConfidenceBar = document.createElement('div');
    _dtwConfidenceBar.id = 'dtw-confidence-bar';
    _dtwConfidenceBar.style.cssText = [
        'height:100%',
        'width:0%',
        'border-radius:99px',
        'transition:width 0.5s cubic-bezier(.4,0,.2,1), background 0.4s ease',
        'background:linear-gradient(90deg,#f97316,#eab308)'
    ].join(';');

    track.appendChild(_dtwConfidenceBar);
    wrapper.appendChild(labelRow);
    wrapper.appendChild(track);
    resultArea.appendChild(wrapper);

    /* Guardar referencia al wrapper */
    _dtwConfidenceBar._wrapper = wrapper;
}

/* Actualizar la barra con un valor de confianza (0-100) */
function dtwShowConfidence(confidence) {
    _ensureConfidenceWidget();
    if (!_dtwConfidenceBar) return;

    var w = _dtwConfidenceBar._wrapper;
    var pct = Math.max(0, Math.min(100, Math.round(confidence)));

    /* Color dinámico: rojo → naranja → verde */
    var hue = Math.round(pct * 1.2); // 0 → rojo (0°), 100 → verde (120°)
    var color = 'hsl(' + hue + ',85%,55%)';

    _dtwConfidenceBar.style.width      = pct + '%';
    _dtwConfidenceBar.style.background = color;
    _dtwConfidenceLabel.textContent    = pct + '%';
    w.style.display = 'flex';
}

/* Ocultar la barra */
function dtwHideConfidence() {
    _ensureConfidenceWidget();
    if (_dtwConfidenceBar && _dtwConfidenceBar._wrapper) {
        _dtwConfidenceBar._wrapper.style.display = 'none';
        _dtwConfidenceBar.style.width = '0%';
    }
}

/* ============================================================
   ANIMACIÓN DE RESULTADO
   Efecto "pop-in" sobre el elemento #output cuando DTW responde
   ============================================================ */
function dtwAnimateResult(outputEl, char) {
    if (!outputEl) return;
    outputEl.classList.remove('dtw-pop');
    /* Forzar reflow para reiniciar la animación */
    void outputEl.offsetWidth;
    outputEl.textContent = char;
    outputEl.classList.remove('empty');
    outputEl.classList.add('dtw-pop');
}

/* Inyectar CSS de animación una sola vez */
(function injectDTWStyles() {
    if (document.getElementById('dtw-ui-styles')) return;
    var style = document.createElement('style');
    style.id  = 'dtw-ui-styles';
    style.textContent = [
        '@keyframes dtwPopIn {',
        '  0%   { transform: scale(0.6) rotate(-8deg); opacity: 0; }',
        '  60%  { transform: scale(1.18) rotate(3deg);  opacity: 1; }',
        '  100% { transform: scale(1)   rotate(0deg);   opacity: 1; }',
        '}',
        '.dtw-pop {',
        '  animation: dtwPopIn 0.42s cubic-bezier(.34,1.56,.64,1) both;',
        '}',
        /* Badge "OFFLINE" en el status bar cuando DTW es el motor activo */
        '.dtw-badge {',
        '  display:inline-flex; align-items:center; gap:4px;',
        '  background:rgba(249,115,22,0.15);',
        '  border:1px solid rgba(249,115,22,0.4);',
        '  color:#f97316;',
        '  font-size:0.68rem; font-weight:700; letter-spacing:0.06em;',
        '  padding:1px 7px; border-radius:99px;',
        '  vertical-align:middle; margin-left:6px;',
        '}',
        /* Top candidates panel */
        '#dtw-top-panel {',
        '  display:none; flex-wrap:wrap; justify-content:center;',
        '  gap:6px; margin-top:10px;',
        '}',
        '#dtw-top-panel.visible { display:flex; }',
        '.dtw-candidate {',
        '  display:inline-flex; flex-direction:column; align-items:center;',
        '  background:rgba(255,255,255,0.06);',
        '  border:1px solid rgba(255,255,255,0.12);',
        '  border-radius:10px; padding:6px 10px; min-width:44px;',
        '  cursor:pointer; transition:background 0.2s,transform 0.15s;',
        '}',
        '.dtw-candidate:hover { background:rgba(255,255,255,0.14); transform:translateY(-2px); }',
        '.dtw-candidate-char { font-size:1.5rem; font-weight:900; line-height:1; }',
        '.dtw-candidate-score { font-size:0.62rem; color:#aaa; margin-top:2px; }'
    ].join('\n');
    document.head.appendChild(style);
})();

/* ============================================================
   PANEL DE CANDIDATOS — muestra el top-5 caracteres del DTW
   ============================================================ */
var _dtwTopPanel = null;

function _ensureTopPanel() {
    if (_dtwTopPanel) return;
    var controls = document.querySelector('.controls');
    if (!controls) return;

    _dtwTopPanel = document.createElement('div');
    _dtwTopPanel.id = 'dtw-top-panel';
    controls.parentNode.insertBefore(_dtwTopPanel, controls);
}

function dtwShowTopCandidates(scores, bestChar, onSelect) {
    _ensureTopPanel();
    if (!_dtwTopPanel || !scores) return;

    /* Ordenar por score ascendente (menor distancia = mejor) */
    var entries = Object.keys(scores).map(function(ch) {
        return { char: ch, score: scores[ch] };
    }).sort(function(a, b) { return a.score - b.score; });

    var top5 = entries.slice(0, 5);

    _dtwTopPanel.innerHTML = '';
    top5.forEach(function(entry) {
        var card = document.createElement('div');
        card.className = 'dtw-candidate';
        if (entry.char === bestChar) {
            card.style.borderColor = '#f97316';
            card.style.background  = 'rgba(249,115,22,0.12)';
        }

        var charEl  = document.createElement('div');
        charEl.className = 'dtw-candidate-char';
        charEl.textContent = entry.char;

        var scoreEl = document.createElement('div');
        scoreEl.className = 'dtw-candidate-score';
        scoreEl.textContent = entry.score.toFixed(3);

        card.appendChild(charEl);
        card.appendChild(scoreEl);

        card.addEventListener('click', function() {
            if (typeof onSelect === 'function') onSelect(entry.char);
        });

        _dtwTopPanel.appendChild(card);
    });

    _dtwTopPanel.classList.add('visible');
}

function dtwHideTopCandidates() {
    if (_dtwTopPanel) _dtwTopPanel.classList.remove('visible');
}

/* ============================================================
   API PÚBLICA PRINCIPAL
   dtwProcessAndDisplay(strokesData, canvasWidth, canvasHeight)
   Ejecuta el reconocimiento DTW completo y actualiza la UI.
   Retorna: { text, confidence } | null
   ============================================================ */
function dtwProcessAndDisplay(strokesData, canvasWidth, canvasHeight) {
    /* Referencia a los elementos de UI de app.js */
    var outputEl    = document.getElementById('output');
    var statusBar   = document.getElementById('statusBar');

    /* Limpiar candidatos previos */
    dtwHideTopCandidates();
    dtwHideConfidence();

    /* Ejecutar el motor */
    var result = dtwRecognize(strokesData, canvasWidth, canvasHeight);

    if (!result || !result.text) {
        if (statusBar) {
            statusBar.innerHTML  = 'No pude leerlo. ¡Escribe más grande!';
            statusBar.className  = 'status-bar error';
        }
        return null;
    }

    /* Mostrar carácter con animación */
    dtwAnimateResult(outputEl, result.text);

    /* Barra de confianza */
    dtwShowConfidence(result.confidence);

    /* Panel de candidatos (top-5) con callback para corrección manual */
    if (result.scores) {
        dtwShowTopCandidates(result.scores, result.text, function(selectedChar) {
            dtwAnimateResult(outputEl, selectedChar);
            if (typeof speakText === 'function') speakText(selectedChar);
        });
    }

    /* Status bar con badge OFFLINE */
    if (statusBar) {
        statusBar.innerHTML = '¡Lo adiviné! 🎉 '
            + '<span class="dtw-badge">⚡ OFFLINE</span>'
            + ' — Confianza: ' + result.confidence + '%';
        statusBar.className = 'status-bar success';
    }

    /* Voz */
    if (typeof speakText === 'function') speakText(result.text);

    return { text: result.text, confidence: result.confidence };
}

/* ============================================================
   HOOK DE LIMPIEZA — resetear widgets cuando se limpia el canvas
   Expone dtwReset() para que clearCanvas() de app.js lo llame.
   ============================================================ */
function dtwReset() {
    dtwHideConfidence();
    dtwHideTopCandidates();
    DTW_BRIDGE.lastResult = null;
}
