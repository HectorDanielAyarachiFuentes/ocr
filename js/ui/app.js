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
  2. Si falla o no hay internet, usa el motor local DTW Vectorial.
*/
async function recognizeDrawing() {
    if (!hasDrawn || busy) return;
    busy = true;

    statusBar.innerHTML = '<span class="spinner"></span> Consultando IA de Google...';
    statusBar.className = 'status-bar thinking';
    output.classList.add('empty');

    if (strokes.length === 0) {
        busy = false;
        setStatus('Dibuja algo primero.', 'error');
        return;
    }

    // 1. Motor Primario: Google API
    var googleResult = await askGoogleAPI(strokes, canvas.width, canvas.height);
    if (googleResult) {
        busy = false;
        output.textContent = googleResult;
        output.classList.remove('empty');
        setStatus('¡Lo adiviné! 🎉 — (Google API)', 'success');
        speakText(googleResult);
        return;
    }

    // 2. Motor de Respaldo: Offline Local (Transformers.js)
    statusBar.innerHTML = '<span class="spinner"></span> Sin conexión... usando IA local TrOCR...';

    if (window.HF_OCR) {
        // Obtener imagen con fondo blanco (TrOCR espera imágenes con fondo blanco, no transparente)
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        var tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);
        
        var imgUrl = tempCanvas.toDataURL('image/png');
        
        var hfResult = await window.HF_OCR.recognize(imgUrl);
        busy = false;
        
        if (hfResult) {
            output.textContent = hfResult;
            output.classList.remove('empty');
            setStatus('¡Lo adiviné! 🎉 — (IA Offline)', 'success');
            speakText(hfResult);
        } else {
            setStatus('No pude leerlo. ¡Intenta de nuevo!', 'error');
        }
    } else {
        busy = false;
        setStatus('Motor offline no disponible.', 'error');
    }
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

/* ── Alternar modo expandido ── */
function toggleExpand() {
    document.body.classList.toggle('expanded-mode');
    const btn = document.getElementById('btn-expand');
    if (document.body.classList.contains('expanded-mode')) {
        btn.textContent = '⛶'; // Puedes cambiar el icono si deseas
        btn.title = 'Contraer área';
    } else {
        btn.textContent = '⛶';
        btn.title = 'Ampliar área';
    }
    // Forzar redimensionado del canvas
    if (typeof resizeCanvas === 'function') resizeCanvas();
}
