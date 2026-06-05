/* =============================================================
   demo.js — Animación de demostración (trazo por trazo)
   ============================================================= */

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
