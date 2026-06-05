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

// Nuevas variables para el crayón mágico
var userStrokes = [];
var crayonColors = ['#FF4B4B', '#FFB300', '#00E676', '#2979FF', '#D500F9', '#FF6D00'];
var currentTraceColor = crayonColors[0];
var patternCache = {};

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
    if (typeof renderUserStrokes === 'function') renderUserStrokes();
}
resizeCanvases();
new ResizeObserver(resizeCanvases).observe(document.getElementById('canvasArea'));

/* ── Mapear coordenada normalizada 0-100 → canvas pixel ── */
function mapX(nx) { return (nx / 100) * guideCanvas.width; }
function mapY(ny) {
    var pad = guideCanvas.height * 0.08;
    return pad + (ny / 100) * (guideCanvas.height - 2 * pad);
}

/* ── Helpers para Renderizado Orgánico ── */
function interpolateStroke(stroke) {
    var dense = [];
    var stepSize = 4; // Distancia para suavizar la animación
    for (var i = 0; i < stroke.length - 1; i++) {
        var p0 = stroke[i];
        var p1 = stroke[i + 1];
        var dx = p1[0] - p0[0];
        var dy = p1[1] - p0[1];
        var dist = Math.sqrt(dx*dx + dy*dy);
        var steps = Math.max(1, Math.floor(dist / stepSize));
        for (var j = 0; j < steps; j++) {
            dense.push([ p0[0] + dx * (j / steps), p0[1] + dy * (j / steps) ]);
        }
    }
    dense.push(stroke[stroke.length - 1]);
    return dense;
}

function drawPerfectStroke(ctx, points, color, sizeRatio) {
    if (points.length === 0) return;
    var mapped = points.map(function(p) { return [mapX(p[0]), mapY(p[1]), 0.5]; });
    var size = Math.max(16, guideCanvas.width * (sizeRatio || 0.05));
    
    var strokeShape = perfectFreehand.getStroke(mapped, {
        size: size,
        thinning: 0,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: false
    });
    
    if (strokeShape.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(strokeShape[0][0], strokeShape[0][1]);
    for (var i = 1; i < strokeShape.length - 1; i++) {
        var p0 = strokeShape[i];
        var p1 = strokeShape[i + 1];
        ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

/* ── Dibujar guía punteada (letra fantasma) ── */
function drawGuide() {
    gCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    var rawStrokes = currentStrokes();
    if (!rawStrokes) return;
    var strokes = rawStrokes.map(interpolateStroke);

    // Dibujamos la guía gruesa y suave (riel)
    strokes.forEach(function (stroke) {
        drawPerfectStroke(gCtx, stroke, 'rgba(200, 215, 230, 0.7)', 0.05);
    });

    // Número de orden al inicio de cada trazo
    strokes.forEach(function (stroke, idx) {
        gCtx.save();
        var sx = mapX(stroke[0][0]);
        var sy = mapY(stroke[0][1]);
        
        // Circulito de fondo
        gCtx.beginPath();
        gCtx.arc(sx, sy, Math.max(12, guideCanvas.width * 0.03), 0, Math.PI * 2);
        gCtx.fillStyle = '#fff';
        gCtx.fill();
        gCtx.lineWidth = 3;
        gCtx.strokeStyle = 'rgba(200, 215, 230, 1)';
        gCtx.stroke();

        gCtx.font = 'bold ' + Math.max(12, guideCanvas.width * 0.035) + 'px Nunito';
        gCtx.fillStyle = '#7a8b9e';
        gCtx.textAlign = 'center';
        gCtx.textBaseline = 'middle';
        gCtx.fillText(String(idx + 1), sx, sy + 1);
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

    var rawStrokes  = currentStrokes();
    var strokes     = rawStrokes.map(interpolateStroke);
    var strokeIndex = 0;
    var pointIndex  = 0;
    var SPEED       = 15; // ms por punto interpolado

    // Colores por trazo
    var colors = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa'];
    var currentDemoPoints = [];

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
            currentDemoPoints = [];
            // Marcar dot activo
            document.querySelectorAll('.stroke-dot').forEach(function(d,i){
                d.className = 'stroke-dot' + (i === strokeIndex ? ' current' : (i < strokeIndex ? ' done' : ''));
            });
        }

        if (pointIndex < stroke.length) {
            currentDemoPoints.push(stroke[pointIndex]);
            
            dCtx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
            
            // Dibujar trazos terminados
            for (var s = 0; s < strokeIndex; s++) {
                drawPerfectStroke(dCtx, strokes[s], colors[s % colors.length], 0.045);
            }
            // Dibujar trazo actual animado
            if (currentDemoPoints.length > 0) {
                drawPerfectStroke(dCtx, currentDemoPoints, color, 0.045);
            }
            
            // Dibujar los números de trazo por encima
            for (var s = 0; s <= strokeIndex; s++) {
                var sx = mapX(strokes[s][0][0]);
                var sy = mapY(strokes[s][0][1]);
                dCtx.save();
                dCtx.beginPath();
                dCtx.arc(sx, sy, Math.max(10, demoCanvas.width * 0.025), 0, Math.PI * 2);
                dCtx.fillStyle = colors[s % colors.length];
                dCtx.fill();
                dCtx.fillStyle = '#fff';
                dCtx.font = 'bold ' + Math.max(10, demoCanvas.width * 0.028) + 'px Nunito';
                dCtx.textAlign = 'center';
                dCtx.textBaseline = 'middle';
                dCtx.fillText(String(s + 1), sx, sy + 1);
                dCtx.restore();
            }

            pointIndex++;
            demoTimer = setTimeout(drawNextPoint, SPEED);
        } else {
            strokeIndex++;
            pointIndex = 0;
            demoTimer = setTimeout(drawNextPoint, 450); // pausa entre trazos
        }
    }

    demoPlaying = true;
    drawNextPoint();
}

function stopDemo() {
    if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
    demoPlaying = false;
}

/* ── Dibujo del niño en traceCanvas (Crayón Mágico) ── */
function getPos(e) {
    var rect = traceCanvas.getBoundingClientRect();
    var cx = (e.clientX !== undefined) ? e.clientX : e.pageX;
    var cy = (e.clientY !== undefined) ? e.clientY : e.pageY;
    var pressure = e.pressure !== undefined ? e.pressure : (e.force !== undefined ? e.force : 0.5);
    return [ cx - rect.left, cy - rect.top, pressure ];
}

function onStart(e) {
    drawing = true;
    if (!hasDrawn) { hasDrawn = true; }
    userStrokes.push([ getPos(e) ]);
    renderUserStrokes();
}
function onEnd() {
    if (!drawing) return;
    drawing = false;
    if (hasDrawn) checkTrace();
}
function onMove(e) {
    if (!drawing) return;
    userStrokes[userStrokes.length - 1].push(getPos(e));
    renderUserStrokes();
}

/* ── Renderizado del efecto Crayón ── */
function getCrayonPattern(color) {
    if (patternCache[color]) return patternCache[color];
    var pCanvas = document.createElement('canvas');
    pCanvas.width = 128;
    pCanvas.height = 128;
    var pCtx = pCanvas.getContext('2d');
    
    pCtx.fillStyle = color;
    pCtx.fillRect(0, 0, 128, 128);
    
    // Ruido para textura de cera
    for (var i = 0; i < 3000; i++) {
        pCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)';
        pCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    
    patternCache[color] = tCtx.createPattern(pCanvas, 'repeat');
    return patternCache[color];
}

function renderUserStrokes() {
    tCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
    
    tCtx.shadowColor = 'rgba(0,0,0,0.15)';
    tCtx.shadowBlur = 4;
    tCtx.shadowOffsetX = 2;
    tCtx.shadowOffsetY = 2;

    userStrokes.forEach(function(points) {
        if (points.length === 0) return;
        
        var strokeShape = perfectFreehand.getStroke(points, {
            size: Math.max(16, traceCanvas.width * 0.05), // Grueso e infantil
            thinning: 0.25,
            smoothing: 0.7,
            streamline: 0.6,
            simulatePressure: true
        });
        
        if (strokeShape.length === 0) return;

        tCtx.beginPath();
        tCtx.moveTo(strokeShape[0][0], strokeShape[0][1]);
        for (var i = 1; i < strokeShape.length - 1; i++) {
            var p0 = strokeShape[i];
            var p1 = strokeShape[i + 1];
            tCtx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
        }
        tCtx.closePath();
        
        tCtx.fillStyle = getCrayonPattern(currentTraceColor);
        tCtx.fill();
    });
    
    tCtx.shadowColor = 'transparent'; // Restablecer sombra
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
    userStrokes = [];
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
    userStrokes  = [];
    // Escoger un color aleatorio para el crayón en cada letra nueva
    currentTraceColor = crayonColors[Math.floor(Math.random() * crayonColors.length)];
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
