/* ============================================================
   app.js — Lógica de dibujo + reconocimiento OCR (Tesseract.js)
   ============================================================ */

window.appContext = (function() {
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

    /* Touch */
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); onStart(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchend',   function (e) { e.preventDefault(); onEnd(); },               { passive: false });
    canvas.addEventListener('touchmove',  function (e) { e.preventDefault(); onMove(e.touches[0]); }, { passive: false });

    /* ── Temporizador con barra animada ── */
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

        var googleResult = await window.askGoogleAPI(strokes, canvas.width, canvas.height);
        if (googleResult) {
            busy = false;
            output.textContent = googleResult;
            output.classList.remove('empty');
            setStatus('¡Lo adiviné! <i class="ph-bold ph-confetti"></i> — (Google API)', 'success');
            speakText(googleResult);
            return;
        }

        // 2. Motor de Respaldo: Offline Local
        statusBar.innerHTML = '<span class="spinner"></span> Sin conexión... usando offline modo...';

        if (window.HF_OCR) {
            // Calcular Bounding Box de los trazos
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let stroke of strokes) {
                let xs = stroke[0];
                let ys = stroke[1];
                for (let i = 0; i < xs.length; i++) {
                    if (xs[i] < minX) minX = xs[i];
                    if (xs[i] > maxX) maxX = xs[i];
                    if (ys[i] < minY) minY = ys[i];
                    if (ys[i] > maxY) maxY = ys[i];
                }
            }

            // Validar límites
            if (minX === Infinity) { 
                minX = 0; minY = 0; maxX = canvas.width; maxY = canvas.height; 
            }
            
            // Añadir margen del dibujo (padding)
            let strokeW = maxX - minX;
            let strokeH = maxY - minY;
            let size = Math.max(strokeW, strokeH);
            let padding = Math.max(20, size * 0.2);
            let finalSize = size + padding * 2;
            
            // Para TrOCR, un tamaño consistente como 384x384 o 224x224 ayuda
            let targetSize = Math.max(finalSize, 224);
            
            var tempCanvas = document.createElement('canvas');
            tempCanvas.width = targetSize;
            tempCanvas.height = targetSize;
            var tempCtx = tempCanvas.getContext('2d');
            
            // Fondo blanco indispensable
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, targetSize, targetSize);
            
            // Calcular desplazamiento para centrar el dibujo en el nuevo lienzo
            let offsetX = (targetSize - strokeW) / 2 - minX;
            let offsetY = (targetSize - strokeH) / 2 - minY;
            
            // Usamos drawImage que dibujará el canvas original desplazado.
            // Al ser el canvas original transparente, solo se pegan los trazos sobre el blanco.
            tempCtx.drawImage(canvas, offsetX, offsetY);
            
            var imgUrl = tempCanvas.toDataURL('image/png');
            
            var hfResult = await window.HF_OCR.recognize(imgUrl);
            busy = false;
            
            if (hfResult) {
                output.textContent = hfResult;
                output.classList.remove('empty');
                setStatus('¡Lo adiviné! <i class="ph-bold ph-confetti"></i> — (Usando offline modo)', 'success');
                speakText(hfResult);
            } else {
                setStatus('No pude leerlo. ¡Intenta de nuevo!', 'error');
            }
        } else {
            busy = false;
            setStatus('Motor offline no disponible.', 'error');
        }
    }

    function speakText(text) {
        if (!text) return;
        const mensaje = new SpeechSynthesisUtterance(text);
        mensaje.lang = 'es-ES';
        mensaje.rate = 1;
        window.speechSynthesis.speak(mensaje);
    }

    function replaySpeech() {
        const text = output.textContent;
        if (text && text !== '—') {
            speakText(text);
        }
    }

    function toggleExpand() {
        document.body.classList.toggle('expanded-mode');
        const btn = document.getElementById('btn-expand-draw');
        if (document.body.classList.contains('expanded-mode')) {
            btn.innerHTML = '<i class="ph-bold ph-corners-in"></i>'; 
            btn.title = 'Contraer área';
        } else {
            btn.innerHTML = '<i class="ph-bold ph-corners-out"></i>';
            btn.title = 'Ampliar área';
        }
        resizeCanvas();
    }

    return {
        clearCanvas: clearCanvas,
        replaySpeech: replaySpeech,
        toggleExpand: toggleExpand,
        resizeCanvas: resizeCanvas
    };
})();
