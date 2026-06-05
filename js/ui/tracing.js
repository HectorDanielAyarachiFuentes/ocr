/* =============================================================
   tracing.js — Dibujo del niño y verificación anti-trampas
   ============================================================= */

/* ── Captura de coordenadas ── */
function getPos(e) {
    var rect = traceCanvas.getBoundingClientRect();
    var cx = (e.clientX !== undefined) ? e.clientX : e.pageX;
    var cy = (e.clientY !== undefined) ? e.clientY : e.pageY;
    var pressure = e.pressure !== undefined ? e.pressure : (e.force !== undefined ? e.force : 0.5);
    return [ cx - rect.left, cy - rect.top, pressure ];
}

function onStart(e) {
    if (letterCompleted) return;
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

// Eventos de ratón
traceCanvas.addEventListener('mousedown',  onStart);
traceCanvas.addEventListener('mouseup',    onEnd);
traceCanvas.addEventListener('mouseleave', onEnd);
traceCanvas.addEventListener('mousemove',  onMove);

// Eventos táctiles
traceCanvas.addEventListener('touchstart', function(e){ e.preventDefault(); onStart(e.touches[0]); }, { passive: false });
traceCanvas.addEventListener('touchend',   function(e){ e.preventDefault(); onEnd(); },               { passive: false });
traceCanvas.addEventListener('touchmove',  function(e){ e.preventDefault(); onMove(e.touches[0]); }, { passive: false });

/* ── Limpiar trazo del niño ── */
function clearTrace() {
    userStrokes = [];
    tCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
    hasDrawn = false;
    instrEl.textContent = '¡Ahora inténtalo tú! Traza encima';
    instrEl.className   = 'instruction';
}

/* ── Verificar trazo (comparación por píxeles) ── */
function checkTrace() {
    var ref = document.createElement('canvas');
    ref.width  = traceCanvas.width;
    ref.height = traceCanvas.height;
    var rc = ref.getContext('2d');
    var strokes = currentStrokes();

    rc.lineWidth   = Math.max(30, traceCanvas.width * 0.12);
    rc.lineCap     = 'round';
    rc.lineJoin    = 'round';
    rc.strokeStyle = '#000';

    // 1. Dibujar TODA la referencia junta
    strokes.forEach(function (stroke) {
        rc.beginPath();
        rc.moveTo(mapX(stroke[0][0]), mapY(stroke[0][1]));
        for (var i = 1; i < stroke.length; i++)
            rc.lineTo(mapX(stroke[i][0]), mapY(stroke[i][1]));
        rc.stroke();
    });

    var refData   = rc.getImageData(0, 0, ref.width, ref.height).data;
    var traceData = tCtx.getImageData(0, 0, traceCanvas.width, traceCanvas.height).data;

    var refPx = 0, childPx = 0, hitPx = 0;
    
    for (var i = 3; i < refData.length; i += 4) {
        if (refData[i] > 50) refPx++;
    }

    for (var i = 3; i < traceData.length; i += 4) {
        if (traceData[i] > 50) {
            childPx++;
            if (refData[i] > 50) hitPx++;
        }
    }

    var score = childPx > 0 ? Math.round((hitPx / childPx) * 100) : 0;
    var coverage = refPx > 0 ? Math.round((hitPx / refPx) * 100) : 0;

    // 2. Verificar que haya dibujado TODOS los trazos requeridos
    var allStrokesHit = true;
    rc.lineWidth = Math.max(16, traceCanvas.width * 0.05); 
    
    for (var s = 0; s < strokes.length; s++) {
        rc.clearRect(0, 0, ref.width, ref.height);
        rc.beginPath();
        rc.moveTo(mapX(strokes[s][0][0]), mapY(strokes[s][0][1]));
        for (var i = 1; i < strokes[s].length; i++)
            rc.lineTo(mapX(strokes[s][i][0]), mapY(strokes[s][i][1]));
        rc.stroke();
        
        var singleRefData = rc.getImageData(0, 0, ref.width, ref.height).data;
        var strokeRefPx = 0, strokeHitPx = 0;
        
        for (var i = 3; i < traceData.length; i += 4) {
            if (singleRefData[i] > 50) {
                strokeRefPx++;
                if (traceData[i] > 50) strokeHitPx++;
            }
        }
        
        // Debe cubrir al menos el 35% de cada trazo individual 
        if (strokeRefPx > 0 && (strokeHitPx / strokeRefPx) < 0.35) {
            allStrokesHit = false;
            break;
        }
    }

    var enoughDrawn = coverage >= 20 && allStrokesHit;

    if (score >= 40 && enoughDrawn && !letterCompleted) {
        letterCompleted = true;
        celebrate();
    } else if (childPx > 100 && !letterCompleted) {
        if (!enoughDrawn && score >= 40) {
            instrEl.textContent = '¡Vas bien! Termina la letra ✍️';
            instrEl.className   = 'instruction';
        } else {
            instrEl.textContent = 'Casi… intenta seguir la guía punteada 😊';
            instrEl.className   = 'instruction';
        }
    }
}
