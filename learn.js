/* =============================================================
   learn.js — Tutorial de escritura del abecedario
   Muestra animación de trazos y permite al niño trazar encima
   ============================================================= */

/* ── Helpers de geometría ── */
var D2R = Math.PI / 180;

function seg(x1, y1, x2, y2) { return [[x1, y1], [x2, y2]]; }

function arc(cx, cy, rx, ry, a0, a1, n) {
    var pts = [], step = (a1 - a0) / n;
    for (var i = 0; i <= n; i++) {
        var a = (a0 + step * i) * D2R;
        pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return pts;
}

function join() {
    var r = [];
    for (var i = 0; i < arguments.length; i++) r = r.concat(arguments[i]);
    return r;
}

/* =============================================================
   DATOS DE LETRAS — coordenadas normalizadas 0-100 × 0-100
   Regla de arcos:
     · Abre DERECHA (B,D,P,R): centro en borde izq, arc(cx,cy,rx,ry, 270, 450, n)  ← horario
     · C/G (concavidad derecha): arc(cx,cy,rx,ry, 330, 30, n)   ← antihorario (step neg)
     · Círculo completo (O): arc(cx,cy,rx,ry, 270, 630, n)      ← horario
   ============================================================= */
var LETTERS_UPPER = {
    'A': [seg(50,5,15,95), seg(50,5,85,95), seg(27,60,73,60)],
    'B': [
        seg(22,5,22,95),
        arc(22,28, 20,23, 270,450, 12),
        arc(22,72, 24,23, 270,450, 12)
    ],
    'C': [arc(50,50, 33,42, 330,30, 22)],
    'D': [seg(22,5,22,95), arc(22,50, 36,45, 270,450, 18)],
    'E': [seg(22,5,22,95), seg(22,5,75,5), seg(22,50,65,50), seg(22,95,75,95)],
    'F': [seg(22,5,22,95), seg(22,5,75,5), seg(22,50,65,50)],
    'G': [arc(50,50, 33,42, 330,5, 22), seg(83,50, 55,50)],
    'H': [seg(20,5,20,95), seg(80,5,80,95), seg(20,50,80,50)],
    'I': [seg(50,5,50,95)],
    'J': [join(seg(65,5,65,78), arc(48,78, 17,17, 0,180, 12))],
    'K': [seg(20,5,20,95), seg(20,50,75,5), seg(20,50,75,95)],
    'L': [seg(22,5,22,95), seg(22,95,78,95)],
    'M': [seg(15,5,15,95), seg(15,5,50,50), seg(50,50,85,5), seg(85,5,85,95)],
    'N': [seg(18,5,18,95), seg(18,5,82,95), seg(82,5,82,95)],
    'O': [arc(50,50, 33,44, 270,630, 28)],
    'P': [seg(22,5,22,95), arc(22,30, 22,25, 270,450, 14)],
    'Q': [arc(50,48, 33,42, 270,630, 28), seg(65,72,82,90)],
    'R': [seg(22,5,22,95), arc(22,30, 22,25, 270,450, 14), seg(44,55,78,95)],
    'S': [arc(50,32, 24,27, 340,175, 14), arc(50,68, 24,27, 160,355, 14)],
    'T': [seg(15,5,85,5), seg(50,5,50,95)],
    'U': [join(seg(20,5,20,72), arc(50,72, 30,23, 180,360, 14), seg(80,72,80,5))],
    'V': [seg(15,5,50,95), seg(85,5,50,95)],
    'W': [seg(12,5,30,95), seg(30,95,50,55), seg(50,55,70,95), seg(70,95,88,5)],
    'X': [seg(15,5,85,95), seg(85,5,15,95)],
    'Y': [seg(15,5,50,50), seg(85,5,50,50), seg(50,50,50,95)],
    'Z': [seg(15,5,85,5), seg(85,5,15,95), seg(15,95,85,95)]
};

var LETTERS_LOWER = {
    'a': [arc(52,65, 20,22, 330,30, 20), seg(72,43,72,88)],
    'b': [seg(22,12,22,90), arc(22,68, 23,22, 270,450, 16)],
    'c': [arc(52,65, 22,24, 330,30, 18)],
    'd': [arc(50,65, 22,22, 270,630, 22), seg(72,43,72,90)],
    'e': [join(seg(30,65,72,65), arc(51,62, 21,22, 0,330, 20))],
    'f': [join(arc(60,28, 18,18, 270,180, 10), seg(42,28,42,90)), seg(28,52,62,52)],
    'g': [arc(50,62, 22,22, 270,630, 22), join(seg(72,40,72,100), arc(50,100, 22,12, 0,180, 10))],
    'h': [seg(20,12,20,90), join(arc(44,58, 24,18, 270,450, 12), seg(68,58,68,90))],
    'i': [seg(50,45,50,90), [[50,25],[50,28]]],
    'j': [join(seg(60,45,60,95), arc(44,95, 16,14, 0,180, 10)), [[60,25],[60,28]]],
    'k': [seg(20,12,20,90), seg(20,62,68,38), seg(38,60,68,90)],
    'l': [join(arc(55,22, 15,15, 270,180, 8), seg(40,22,40,90))],
    'm': [join(seg(20,52,20,90), arc(38,52, 18,18, 270,450, 10), seg(56,52,56,90), arc(74,52, 18,18, 270,450, 10), seg(92,52,92,90))],
    'n': [join(seg(20,52,20,90), arc(44,52, 24,20, 270,450, 12), seg(68,52,68,90))],
    'o': [arc(50,65, 24,25, 270,630, 24)],
    'p': [arc(44,65, 22,22, 270,630, 22), seg(22,43,22,100)],
    'q': [arc(56,65, 22,22, 270,630, 22), seg(78,43,78,100)],
    'r': [join(seg(22,52,22,90), arc(46,52, 24,18, 270,360, 8))],
    's': [arc(52,55, 18,16, 340,175, 12), arc(48,72, 18,16, 160,355, 12)],
    't': [join(arc(58,28, 16,16, 270,180, 8), seg(42,28,42,90)), seg(25,55,64,55)],
    'u': [join(seg(20,42,20,72), arc(50,72, 30,18, 180,360, 12), seg(80,72,80,42))],
    'v': [seg(18,42,50,90), seg(82,42,50,90)],
    'w': [seg(15,42,28,90), seg(28,90,50,60), seg(50,60,72,90), seg(72,90,85,42)],
    'x': [seg(20,42,80,90), seg(80,42,20,90)],
    'y': [seg(20,42,50,75), seg(80,42,35,100)],
    'z': [seg(18,42,82,42), seg(82,42,18,90), seg(18,90,82,90)]
};

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
    // Auto-play demo cuando cambia la letra
    setTimeout(playDemo, 400);
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

/* ── Inicio ── */
loadLetter();
