/* =============================================================
   learn_bundle.js — Lógica de Aprender (SPA adaptada)
   Combina drawing.js, demo.js, tracing.js y learn.js en un IIFE
   ============================================================= */

window.learnContext = (function() {
    /* ── Estado global ── */
    var currentCase  = 'upper';
    var currentIndex = 0;
    var demoPlaying  = false;
    var demoTimer    = null;
    var letterTimer  = null; 
    var starsEarned = 0;
    var totalScore = 0;
    var letterCompleted = false;
    var drawStartTime = 0;
    var drawEndTime = 0;
    
    var userStrokes = [];
    var crayonColors = ['#FF4B4B', '#FFB300', '#00E676', '#2979FF', '#D500F9', '#FF6D00'];
    var currentTraceColor = crayonColors[0];
    var patternCache = {};
    var drawing  = false;
    var hasDrawn = false;

    /* ── Referencias DOM Principales ── */
    var instrEl  = document.getElementById('instruction');
    var letterEl = document.getElementById('currentLetter');
    var guideCanvas  = document.getElementById('guideCanvas');
    var demoCanvas   = document.getElementById('demoCanvas');
    var traceCanvas  = document.getElementById('traceCanvas');
    var gCtx         = guideCanvas ? guideCanvas.getContext('2d') : null;
    var dCtx         = demoCanvas ? demoCanvas.getContext('2d') : null;
    var tCtx         = traceCanvas ? traceCanvas.getContext('2d') : null;
    var progressEl   = document.getElementById('strokeProgress');

    /* ==========================================
       drawing.js
       ========================================== */
    function resizeCanvases() {
        var area = document.getElementById('canvasArea');
        if (!area || !guideCanvas) return;
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
        renderUserStrokes();
    }

    if (document.getElementById('canvasArea')) {
        new ResizeObserver(resizeCanvases).observe(document.getElementById('canvasArea'));
    }

    function mapX(nx) { return (nx / 100) * guideCanvas.width; }
    function mapY(ny) {
        var pad = guideCanvas.height * 0.08;
        return pad + (ny / 100) * (guideCanvas.height - 2 * pad);
    }

    function interpolateStroke(stroke) {
        var dense = [];
        var stepSize = 4;
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

    function drawGuide() {
        if (!gCtx) return;
        gCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
        var rawStrokes = currentStrokes();
        if (!rawStrokes) return;
        var strokes = rawStrokes.map(interpolateStroke);

        strokes.forEach(function (stroke) {
            drawPerfectStroke(gCtx, stroke, 'rgba(200, 215, 230, 0.7)', 0.05);
        });

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

    function updateStrokeDots() {
        var strokes = currentStrokes();
        if (!strokes || !progressEl) return;
        progressEl.innerHTML = '';
        strokes.forEach(function (_, i) {
            var d = document.createElement('div');
            d.className = 'stroke-dot' + (i === 0 ? ' current' : '');
            d.id = 'dot-' + i;
            progressEl.appendChild(d);
        });
    }

    function getCrayonPattern(color) {
        if (patternCache[color]) return patternCache[color];
        var pCanvas = document.createElement('canvas');
        pCanvas.width = 128;
        pCanvas.height = 128;
        var pCtx = pCanvas.getContext('2d');
        
        pCtx.fillStyle = color;
        pCtx.fillRect(0, 0, 128, 128);
        
        for (var i = 0; i < 3000; i++) {
            pCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)';
            pCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
        }
        
        patternCache[color] = tCtx.createPattern(pCanvas, 'repeat');
        return patternCache[color];
    }

    function renderUserStrokes() {
        if (!tCtx) return;
        tCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
        
        tCtx.shadowColor = 'rgba(0,0,0,0.15)';
        tCtx.shadowBlur = 4;
        tCtx.shadowOffsetX = 2;
        tCtx.shadowOffsetY = 2;

        userStrokes.forEach(function(points) {
            if (points.length === 0) return;
            
            var strokeShape = perfectFreehand.getStroke(points, {
                size: Math.max(16, traceCanvas.width * 0.05),
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
        
        tCtx.shadowColor = 'transparent';
    }

    /* ==========================================
       demo.js
       ========================================== */
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
        var SPEED       = 15;

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
                document.querySelectorAll('.stroke-dot').forEach(function(d,i){
                    d.className = 'stroke-dot' + (i === strokeIndex ? ' current' : (i < strokeIndex ? ' done' : ''));
                });
            }

            if (pointIndex < stroke.length) {
                currentDemoPoints.push(stroke[pointIndex]);
                
                dCtx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
                
                for (var s = 0; s < strokeIndex; s++) {
                    drawPerfectStroke(dCtx, strokes[s], colors[s % colors.length], 0.045);
                }
                if (currentDemoPoints.length > 0) {
                    drawPerfectStroke(dCtx, currentDemoPoints, color, 0.045);
                }
                
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
                demoTimer = setTimeout(drawNextPoint, 450);
            }
        }

        demoPlaying = true;
        drawNextPoint();
    }

    function stopDemo() {
        if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
        demoPlaying = false;
    }

    /* ==========================================
       tracing.js
       ========================================== */
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
        if (!hasDrawn) { 
            hasDrawn = true; 
            drawStartTime = Date.now();
        }
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

    if (traceCanvas) {
        traceCanvas.addEventListener('mousedown',  onStart);
        traceCanvas.addEventListener('mouseup',    onEnd);
        traceCanvas.addEventListener('mouseleave', onEnd);
        traceCanvas.addEventListener('mousemove',  onMove);

        traceCanvas.addEventListener('touchstart', function(e){ e.preventDefault(); onStart(e.touches[0]); }, { passive: false });
        traceCanvas.addEventListener('touchend',   function(e){ e.preventDefault(); onEnd(); },               { passive: false });
        traceCanvas.addEventListener('touchmove',  function(e){ e.preventDefault(); onMove(e.touches[0]); }, { passive: false });
    }

    function clearTrace() {
        userStrokes = [];
        tCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
        hasDrawn = false;
        drawStartTime = 0;
        instrEl.textContent = '¡Ahora inténtalo tú! Traza encima';
        instrEl.className   = 'instruction';
    }

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
            
            if (strokeRefPx > 0 && (strokeHitPx / strokeRefPx) < 0.35) {
                allStrokesHit = false;
                break;
            }
        }

        var enoughDrawn = coverage >= 20 && allStrokesHit;

        if (score >= 40 && enoughDrawn && !letterCompleted) {
            letterCompleted = true;
            drawEndTime = Date.now();
            
            // Lógica de puntos
            var basePoints = 500;
            var precisionMod = (score / 100) * (coverage / 100);
            var precisionPoints = Math.round(basePoints * precisionMod * 1.5);
            
            // Bono de velocidad (max 500 puntos, decae con el tiempo)
            var timeTaken = Math.max(0.1, (drawEndTime - drawStartTime) / 1000);
            var timeBonus = Math.round(Math.max(0, 500 - (timeTaken * 40)));
            
            var earnedPoints = precisionPoints + timeBonus + 100; // 100 de base asegurados
            celebrate(earnedPoints);
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

    /* ==========================================
       learn.js
       ========================================== */
    function currentStrokes() {
        var set  = currentCase === 'upper' ? LETTERS_UPPER : LETTERS_LOWER;
        var keys = Object.keys(set);
        return set[keys[currentIndex]];
    }

    function currentLetterChar() {
        var set  = currentCase === 'upper' ? LETTERS_UPPER : LETTERS_LOWER;
        return Object.keys(set)[currentIndex];
    }

    function celebrate(pointsEarned) {
        if (typeof window.SFX !== 'undefined') window.SFX.playDing();
        if (typeof window.confetti === 'function') {
            window.confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#FF4B4B', '#FFB300', '#00E676', '#2979FF', '#D500F9']
            });
        }

        starsEarned++;
        totalScore += (pointsEarned || 1000);
        
        var starEl = document.getElementById('starCount');
        var scoreEl = document.getElementById('totalScore');
        if (starEl) starEl.textContent = starsEarned;
        if (scoreEl) scoreEl.textContent = totalScore;

        instrEl.innerHTML = '¡Muy bien! <i class="ph-bold ph-confetti"></i>';
        instrEl.className   = 'instruction success';
        
        // Animación de estrella clásica
        var el = document.createElement('div');
        el.className = 'celebrate';
        el.innerHTML = '<i class="ph-fill ph-star"></i>';
        document.body.appendChild(el);
        setTimeout(function() {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1600);

        // Animación de puntaje flotante
        var floatEl = document.createElement('div');
        floatEl.className = 'floating-score';
        floatEl.innerHTML = '+' + (pointsEarned || 1000);
        // Centrar en pantalla
        floatEl.style.left = '50%';
        floatEl.style.top = '40%';
        floatEl.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(floatEl);
        setTimeout(function() {
            if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
        }, 2000);
    }

    function speakChar(char) {
        if (!char) return;
        const mensaje = new SpeechSynthesisUtterance(char);
        mensaje.lang = 'es-ES';
        mensaje.rate = 1;
        window.speechSynthesis.speak(mensaje);
    }

    function loadLetter() {
        stopDemo();
        if (dCtx) {
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
        drawGuide();
        
        if (letterTimer) clearTimeout(letterTimer);
        letterTimer = setTimeout(function() {
            speakChar(char);
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

    function toggleExpand() {
        document.body.classList.toggle('expanded-mode');
        const btn = document.getElementById('btn-expand-learn');
        if (document.body.classList.contains('expanded-mode')) {
            btn.innerHTML = '<i class="ph-bold ph-corners-in"></i>'; 
            btn.title = 'Contraer área';
        } else {
            btn.innerHTML = '<i class="ph-bold ph-corners-out"></i>';
            btn.title = 'Ampliar área';
        }
        resizeCanvases();
    }

    // Inicialización si los canvas existen
    if (guideCanvas) {
        resizeCanvases();
        loadLetter();
    }

    return {
        playDemo: playDemo,
        setCase: setCase,
        clearTrace: clearTrace,
        prevLetter: prevLetter,
        nextLetter: nextLetter,
        replaySpeech: function() { speakChar(currentLetterChar()); },
        toggleExpand: toggleExpand,
        resizeCanvases: resizeCanvases
    };
})();
