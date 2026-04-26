/* ============================================================
   app.js — Lógica de dibujo + reconocimiento OCR (Tesseract.js)
   ============================================================ */

var canvas      = document.getElementById('canvas');
var ctx         = canvas.getContext('2d');
var wrapper     = document.getElementById('canvasWrapper');
var hint        = document.getElementById('canvasHint');
var output      = document.getElementById('output');
var statusBar   = document.getElementById('statusBar');
var progressBar = document.getElementById('progressBar');

var drawing   = false;
var hasDrawn  = false;
var autoTimer = null;
var busy      = false;

/* ── Rastreo de trazos para Google API ── */
var strokes = [];
var currentStroke = { x: [], y: [], t: [] };

/* ── Ajustar canvas al tamaño real del wrapper ── */
function resizeCanvas() {
    var w = wrapper.clientWidth;
    var h = wrapper.clientHeight;
    var img = null;
    try { img = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch (e) {}
    canvas.width  = w;
    canvas.height = h;
    ctx.lineWidth   = Math.max(10, w * 0.028);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = '#222';
    if (img) { try { ctx.putImageData(img, 0, 0); } catch (e) {} }
}
resizeCanvas();
new ResizeObserver(resizeCanvas).observe(wrapper);

/* ── Helpers de UI ── */
function setStatus(msg, mode) {
    statusBar.innerHTML = msg;
    statusBar.className = 'status-bar ' + (mode || '');
}
function setProgress(pct) {
    progressBar.style.width = pct + '%';
}

/* ── Coordenadas del puntero / dedo ── */
function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var cx = (e.clientX !== undefined) ? e.clientX : e.pageX;
    var cy = (e.clientY !== undefined) ? e.clientY : e.pageY;
    return { x: cx - rect.left, y: cy - rect.top };
}

/* ── Eventos de dibujo ── */
function onStart(e) {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    drawing = true;
    if (!hasDrawn) { hint.classList.add('hidden'); hasDrawn = true; }
    setProgress(0);
    var p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    
    currentStroke = { x: [], y: [], t: [] };
    currentStroke.x.push(p.x);
    currentStroke.y.push(p.y);
    currentStroke.t.push(Date.now());
}
function onEnd() {
    if (!drawing) return;
    drawing = false;
    ctx.beginPath();
    
    strokes.push([currentStroke.x, currentStroke.y, currentStroke.t]);
    
    if (hasDrawn) {
        setProgress(0);
        scheduleRecognize();
    }
}
function onMove(e) {
    if (!drawing) return;
    var p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    
    currentStroke.x.push(p.x);
    currentStroke.y.push(p.y);
    currentStroke.t.push(Date.now());
}

/* Mouse */
canvas.addEventListener('mousedown',  onStart);
canvas.addEventListener('mouseup',    onEnd);
canvas.addEventListener('mouseleave', onEnd);
canvas.addEventListener('mousemove',  onMove);

/* Touch — touch-action:none (CSS) bloquea el scroll del canvas */
canvas.addEventListener('touchstart', function (e) { e.preventDefault(); onStart(e.touches[0]); }, { passive: false });
canvas.addEventListener('touchend',   function (e) { e.preventDefault(); onEnd(); },               { passive: false });
canvas.addEventListener('touchmove',  function (e) { e.preventDefault(); onMove(e.touches[0]); }, { passive: false });

/* ── Temporizador con barra animada (700 ms de espera) ── */
function scheduleRecognize() {
    var DELAY = 700;
    var start = Date.now();
    setStatus('Preparando…', 'thinking');

    function tick() {
        var elapsed = Date.now() - start;
        setProgress(Math.min(100, (elapsed / DELAY) * 100));
        if (elapsed < DELAY) {
            autoTimer = setTimeout(tick, 30);
        } else {
            autoTimer = null;
            setProgress(0);
            recognizeDrawing();
        }
    }
    autoTimer = setTimeout(tick, 30);
}

/* ── Limpiar lienzo ── */
function clearCanvas() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
    busy     = false;
    strokes  = [];
    output.textContent = '—';
    output.classList.add('empty');
    hint.classList.remove('hidden');
    setProgress(0);
    setStatus('Lienzo limpio.', '');
}

/*
  Reconocimiento principal HÍBRIDO:
  1. Intenta Google Handwriting API.
  2. Si falla o no hay internet, usa Tesseract + Geometría.
*/
async function recognizeDrawing() {
    if (!hasDrawn || busy) return;
    busy = true;

    statusBar.innerHTML = '<span class="spinner"></span> Consultando IA de Google...';
    statusBar.className = 'status-bar thinking';
    output.classList.add('empty');

    var base = buildBaseCanvas(canvas, ctx);
    if (!base) {
        busy = false;
        setStatus('Dibuja algo primero.', 'error');
        return;
    }

    // 1. Motor Primario: Google API
    if (strokes.length > 0) {
        var googleResult = await askGoogleAPI(strokes, canvas.width, canvas.height);
        if (googleResult) {
            busy = false;
            output.textContent = googleResult;
            output.classList.remove('empty');
            setStatus('¡Lo adiviné! 🎉 — Escucha y voz completada.', 'success');
            speakText(googleResult);
            return;
        }
    }

    // 2. Motor de Respaldo: Offline Local (Geometría + Tesseract)
    statusBar.innerHTML = '<span class="spinner"></span> Sin conexión... usando IA local...';

    var variants = [
        base.toDataURL('image/png'),
        erodeOff(cloneOff(base), 1).toDataURL('image/png'),
        erodeOff(cloneOff(base), 2).toDataURL('image/png'),
        invertOff(base).toDataURL('image/png')
    ];

    var tasks = [];
    var psms  = [7, 8];
    for (var vi = 0; vi < variants.length; vi++) {
        for (var pi = 0; pi < psms.length; pi++) {
            tasks.push(tryRecognize(variants[vi], psms[pi]));
        }
    }
    tasks.push(tryRecognize(variants[0], 13)); // PSM 13: raw line

    var shapeResult = matchShape(base);

    Promise.all(tasks).then(function (results) {
        busy = false;
        var bestTess = { text: '', confidence: -1 };

        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            if (r.text && r.confidence > bestTess.confidence) bestTess = r;
        }
        if (!bestTess.text && results[results.length - 1].text)
            bestTess = results[results.length - 1];

        var finalBest;
        var tessText = bestTess.text;
        
        // Filtro Lógico: Veto a Tesseract
        var isTesseractVetoed = false;
        if (tessText && shapeResult.scores) {
            var shapeScoreForTess = shapeResult.scores[tessText];
            if (shapeScoreForTess === undefined) {
                 var alt = tessText === tessText.toLowerCase() ? tessText.toUpperCase() : tessText.toLowerCase();
                 shapeScoreForTess = shapeResult.scores[alt];
            }
            if (shapeScoreForTess > 18) {
                 isTesseractVetoed = true;
            }
        }

        // Decisión final usando el veto
        if (shapeResult.distance < 15) {
            finalBest = shapeResult;
        } else if (!isTesseractVetoed && bestTess.confidence > 65) {
            finalBest = bestTess;
        } else {
            finalBest = shapeResult; // Si Tesseract está vetado, confiamos en la geometría
        }

        if (finalBest && finalBest.text) {
            output.textContent = finalBest.text;
            output.classList.remove('empty');
            var tStatus = isTesseractVetoed ? 'VETADO' : Math.round(bestTess.confidence);
            var debugInfo = 'Geometría: ' + shapeResult.text + ' (' + Math.round(shapeResult.distance) + ') | OCR: ' + bestTess.text + ' (' + tStatus + ')';
            setStatus('¡Lo adiviné! 🎉 — Escucha y voz completada.', 'success');
            
            // Motor de Voz
            speakText(finalBest.text);
        } else {
            setStatus('No pude leerlo. ¡Escribe más grande!', 'error');
        }
    });
}

/* ── Motor de Voz (Text-to-Speech) ── */
function speakText(text) {
    if (!text) return;
    const mensaje = new SpeechSynthesisUtterance(text);
    mensaje.lang = 'es-ES';
    mensaje.rate = 1;
    window.speechSynthesis.speak(mensaje);
}

/* ── Repetir audio del resultado actual ── */
function replaySpeech() {
    const text = output.textContent;
    if (text && text !== '—') {
        speakText(text);
    }
}
