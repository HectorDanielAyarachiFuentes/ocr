/* =============================================================
   learn.js — Tutorial de escritura del abecedario
   Muestra animación de trazos y permite al niño trazar encima
   ============================================================= */



/* ── Estado global ── */
var currentCase  = 'upper';
var letterOrder  = Object.keys(LETTERS_UPPER);
var currentIndex = 0;
var demoPlaying  = false;
var demoTimer    = null;

/* ── Referencias DOM ── */
var guideCanvas  = document.getElementById('guideCanvas');
var demoCanvas   = document.getElementById('demoCanvas');
var traceCanvas  = document.getElementById('traceCanvas');
var gCtx         = guideCanvas.getContext('2d');
var dCtx         = demoCanvas.getContext('2d');
var tCtx         = traceCanvas.getContext('2d');
var instrEl      = document.getElementById('instruction');
var letterEl     = document.getElementById('currentLetter');
var progressEl   = document.getElementById('strokeProgress');

var drawing  = false;
var hasDrawn = false;

/* ── Resize: ajusta los 3 canvas al wrapper ── */
function resizeCanvases() {
    var area = document.getElementById('canvasArea');
    var w = area.clientWidth;
    var h = area.clientHeight;
    [guideCanvas, demoCanvas, traceCanvas].forEach(function (c) {
        c.width  = w;
        c.height = h;
    });
    tCtx.lineWidth   = Math.max(8, w * 0.022);
    tCtx.lineCap     = 'round';
    tCtx.lineJoin    = 'round';
    tCtx.strokeStyle = '#1a237e';
    drawGuide();
}
resizeCanvases();
new ResizeObserver(resizeCanvases).observe(document.getElementById('canvasArea'));

/* ── Mapear coordenada normalizada 0-100 → canvas pixel ── */
function mapX(nx) { return (nx / 100) * guideCanvas.width; }
function mapY(ny) {
    var pad = guideCanvas.height * 0.08;
    return pad + (ny / 100) * (guideCanvas.height - 2 * pad);
}

/* ── Dibujar guía punteada (letra fantasma) ── */
function drawGuide() {
    gCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    var strokes = currentStrokes();
    if (!strokes) return;

    gCtx.save();
    gCtx.setLineDash([8, 10]);
    gCtx.lineWidth   = Math.max(6, guideCanvas.width * 0.025);
    gCtx.lineCap     = 'round';
    gCtx.lineJoin    = 'round';
    gCtx.strokeStyle = 'rgba(255,107,53,0.25)';

    strokes.forEach(function (stroke) {
        gCtx.beginPath();
        gCtx.moveTo(mapX(stroke[0][0]), mapY(stroke[0][1]));
        for (var i = 1; i < stroke.length; i++)
            gCtx.lineTo(mapX(stroke[i][0]), mapY(stroke[i][1]));
        gCtx.stroke();
    });
    gCtx.restore();

    // Número de orden al inicio de cada trazo
    strokes.forEach(function (stroke, idx) {
        gCtx.save();
        gCtx.font = 'bold ' + Math.max(12, guideCanvas.width * 0.04) + 'px Nunito';
        gCtx.fillStyle = 'rgba(255,107,53,0.5)';
        gCtx.fillText(String(idx + 1), mapX(stroke[0][0]) - 6, mapY(stroke[0][1]) - 8);
        gCtx.restore();
    });

    updateStrokeDots();
}

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

/* ── Puntos de progreso de trazos ── */
function updateStrokeDots() {
    var strokes = currentStrokes();
    if (!strokes) return;
    progressEl.innerHTML = '';
    strokes.forEach(function (_, i) {
        var d = document.createElement('div');
        d.className = 'stroke-dot' + (i === 0 ? ' current' : '');
        d.id = 'dot-' + i;
        progressEl.appendChild(d);
    });
}

/* ── Animación de demostración (trazo por trazo) ── */
function playDemo() {
    if (demoPlaying) return;
    stopDemo();
    dCtx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
    instrEl.textContent = 'Mira el orden de los trazos';
    instrEl.className   = 'instruction thinking';

    var strokes     = currentStrokes();
    var strokeIndex = 0;
    var pointIndex  = 0;
    var SPEED       = 18; // ms por punto

    // Colores por trazo
    var colors = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa'];

    function drawNextPoint() {
        if (strokeIndex >= strokes.length) {
            demoPlaying = false;
            instrEl.textContent = '¡Ahora inténtalo tú! Traza encima';
            instrEl.className   = 'instruction';
            return;
        }
        var stroke = strokes[strokeIndex];
        var color  = colors[strokeIndex % colors.length];

        if (pointIndex === 0) {
            // Dibujar número de trazo
            var sx = mapX(stroke[0][0]);
            var sy = mapY(stroke[0][1]);
            dCtx.save();
            dCtx.beginPath();
            dCtx.arc(sx, sy, Math.max(10, demoCanvas.width * 0.025), 0, Math.PI * 2);
            dCtx.fillStyle = color;
            dCtx.fill();
            dCtx.fillStyle = '#fff';
            dCtx.font = 'bold ' + Math.max(10, demoCanvas.width * 0.028) + 'px Nunito';
            dCtx.textAlign = 'center';
            dCtx.textBaseline = 'middle';
            dCtx.fillText(String(strokeIndex + 1), sx, sy);
            dCtx.restore();

            // Marcar dot activo
            document.querySelectorAll('.stroke-dot').forEach(function(d,i){
                d.className = 'stroke-dot' + (i === strokeIndex ? ' current' : (i < strokeIndex ? ' done' : ''));
            });

            dCtx.beginPath();
            dCtx.lineWidth   = Math.max(6, demoCanvas.width * 0.022);
            dCtx.lineCap     = 'round';
            dCtx.lineJoin    = 'round';
            dCtx.strokeStyle = color;
            dCtx.moveTo(sx, sy);
        }

        if (pointIndex < stroke.length) {
            var pt = stroke[pointIndex];
            dCtx.lineTo(mapX(pt[0]), mapY(pt[1]));
            dCtx.stroke();
            dCtx.beginPath();
            dCtx.moveTo(mapX(pt[0]), mapY(pt[1]));
            pointIndex++;
            demoTimer = setTimeout(drawNextPoint, SPEED);
        } else {
            strokeIndex++;
            pointIndex = 0;
            demoTimer = setTimeout(drawNextPoint, 350); // pausa entre trazos
        }
    }

    demoPlaying = true;
    drawNextPoint();
}

function stopDemo() {
    if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
    demoPlaying = false;
}

/* ── Dibujo del niño en traceCanvas ── */
function getPos(e) {
    var rect = traceCanvas.getBoundingClientRect();
    var cx = (e.clientX !== undefined) ? e.clientX : e.pageX;
    var cy = (e.clientY !== undefined) ? e.clientY : e.pageY;
    return { x: cx - rect.left, y: cy - rect.top };
}

function onStart(e) {
    drawing = true;
    if (!hasDrawn) { hasDrawn = true; }
    var p = getPos(e);
    tCtx.beginPath();
    tCtx.moveTo(p.x, p.y);
}
function onEnd() {
    if (!drawing) return;
    drawing = false;
    tCtx.beginPath();
    if (hasDrawn) checkTrace();
}
function onMove(e) {
    if (!drawing) return;
    var p = getPos(e);
    tCtx.lineTo(p.x, p.y);
    tCtx.stroke();
    tCtx.beginPath();
    tCtx.moveTo(p.x, p.y);
}

traceCanvas.addEventListener('mousedown',  onStart);
traceCanvas.addEventListener('mouseup',    onEnd);
traceCanvas.addEventListener('mouseleave', onEnd);
traceCanvas.addEventListener('mousemove',  onMove);
traceCanvas.addEventListener('touchstart', function(e){ e.preventDefault(); onStart(e.touches[0]); }, { passive: false });
traceCanvas.addEventListener('touchend',   function(e){ e.preventDefault(); onEnd(); },               { passive: false });
traceCanvas.addEventListener('touchmove',  function(e){ e.preventDefault(); onMove(e.touches[0]); }, { passive: false });

/* ── Verificar trazo (comparación por píxeles) ── */
function checkTrace() {
    // Renderizar referencia en offscreen
    var ref = document.createElement('canvas');
    ref.width  = traceCanvas.width;
    ref.height = traceCanvas.height;
    var rc = ref.getContext('2d');
    var strokes = currentStrokes();

    rc.lineWidth   = Math.max(30, traceCanvas.width * 0.12); // trazo grueso = tolerancia
    rc.lineCap     = 'round';
    rc.lineJoin    = 'round';
    rc.strokeStyle = '#000';

    strokes.forEach(function (stroke) {
        rc.beginPath();
        rc.moveTo(mapX(stroke[0][0]), mapY(stroke[0][1]));
        for (var i = 1; i < stroke.length; i++)
            rc.lineTo(mapX(stroke[i][0]), mapY(stroke[i][1]));
        rc.stroke();
    });

    // Contar píxeles del niño que caen dentro de la referencia
    var refData   = rc.getImageData(0, 0, ref.width, ref.height).data;
    var traceData = tCtx.getImageData(0, 0, traceCanvas.width, traceCanvas.height).data;

    var childPx = 0, hitPx = 0;
    for (var i = 3; i < traceData.length; i += 4) {
        if (traceData[i] > 50) {
            childPx++;
            if (refData[i] > 50) hitPx++;
        }
    }

    var score = childPx > 0 ? Math.round((hitPx / childPx) * 100) : 0;

    if (score >= 40) {
        celebrate();
    } else if (childPx > 100) {
        instrEl.textContent = 'Casi… intenta seguir la guía punteada 😊';
        instrEl.className   = 'instruction';
    }
}

/* ── Limpiar trazo del niño ── */
function clearTrace() {
    tCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
    hasDrawn = false;
    instrEl.textContent = '¡Ahora inténtalo tú! Traza encima';
    instrEl.className   = 'instruction';
}

/* ── Celebración ── */
function celebrate() {
    instrEl.textContent = '¡Muy bien! 🎉';
    instrEl.className   = 'instruction success';
    var el = document.createElement('div');
    el.className = 'celebrate';
    el.textContent = '⭐';
    document.body.appendChild(el);
    setTimeout(function() {
        if (el.parentNode) el.parentNode.removeChild(el);
    }, 1600);
}

/* ── Navegación ── */
function loadLetter() {
    stopDemo();
    dCtx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
    tCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
    hasDrawn     = false;
    demoPlaying  = false;
    var char     = currentLetterChar();
    letterEl.textContent = char;
    instrEl.textContent  = 'Primero mira cómo se hace';
    instrEl.className    = 'instruction';
    drawGuide();
    // Auto-play demo y voz cuando cambia la letra
    setTimeout(function() {
        speakText(char);
        playDemo();
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

/* ── Motor de Voz (Text-to-Speech) ── */
function speakText(text) {
    if (!text) return;
    const mensaje = new SpeechSynthesisUtterance(text);
    mensaje.lang = 'es-ES';
    mensaje.rate = 1;
    window.speechSynthesis.speak(mensaje);
}

/* ── Repetir audio de la letra actual ── */
function replaySpeech() {
    const char = currentLetterChar();
    if (char) {
        speakText(char);
    }
}

/* ── Inicio ── */
loadLetter();

/* ── Alternar modo expandido ── */
function toggleExpand() {
    document.body.classList.toggle('expanded-mode');
    const btn = document.getElementById('btn-expand');
    if (document.body.classList.contains('expanded-mode')) {
        btn.textContent = '⛶'; 
        btn.title = 'Contraer área';
    } else {
        btn.textContent = '⛶';
        btn.title = 'Ampliar área';
    }
    // Forzar redimensionado de los canvas
    if (typeof resizeCanvases === 'function') resizeCanvases();
}
