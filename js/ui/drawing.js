/* =============================================================
   drawing.js — Lógica de Canvas, Renderizado y Crayón Mágico
   ============================================================= */

/* ── Referencias DOM ── */
var guideCanvas  = document.getElementById('guideCanvas');
var demoCanvas   = document.getElementById('demoCanvas');
var traceCanvas  = document.getElementById('traceCanvas');
var gCtx         = guideCanvas.getContext('2d');
var dCtx         = demoCanvas.getContext('2d');
var tCtx         = traceCanvas.getContext('2d');

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
new ResizeObserver(resizeCanvases).observe(document.getElementById('canvasArea'));
// Nota: llamamos a resizeCanvases al inicializar app en learn.js

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

/* ── Puntos de progreso de trazos ── */
var progressEl = document.getElementById('strokeProgress');
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
