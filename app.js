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
    statusBar.textContent = msg;
    statusBar.className   = 'status-bar ' + (mode || '');
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
}
function onEnd() {
    if (!drawing) return;
    drawing = false;
    ctx.beginPath();
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
    output.textContent = '—';
    output.classList.add('empty');
    hint.classList.remove('hidden');
    setProgress(0);
    setStatus('Lienzo limpio.', '');
}

/* ============================================================
   PRE-PROCESAMIENTO DE IMAGEN
   1. Detectar bounding box del trazo dibujado
   2. Recortar + padding + escalar al menos 3× (mínimo 400 px alto)
   3. Binarizar: negro puro / blanco puro (elimina antialiasing)
   ============================================================ */
function buildBaseCanvas() {
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    var minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;

    for (var y = 0; y < canvas.height; y++) {
        for (var x = 0; x < canvas.width; x++) {
            var i = (y * canvas.width + x) * 4;
            if (data[i + 3] > 20 && (data[i] + data[i + 1] + data[i + 2]) < 600) {
                if (x < minX) minX = x;  if (x > maxX) maxX = x;
                if (y < minY) minY = y;  if (y > maxY) maxY = y;
            }
        }
    }
    if (minX >= maxX || minY >= maxY) return null;

    var pad = Math.max(30, Math.round((maxX - minX) * 0.15));
    minX = Math.max(0, minX - pad);           minY = Math.max(0, minY - pad);
    maxX = Math.min(canvas.width,  maxX + pad);  maxY = Math.min(canvas.height, maxY + pad);

    var cw = maxX - minX, ch = maxY - minY;
    var scale = Math.max(3, Math.ceil(400 / ch));

    var off = document.createElement('canvas');
    off.width = cw * scale;  off.height = ch * scale;
    var oc = off.getContext('2d');

    oc.fillStyle = '#fff';
    oc.fillRect(0, 0, off.width, off.height);
    oc.drawImage(canvas, minX, minY, cw, ch, 0, 0, off.width, off.height);

    var sd = oc.getImageData(0, 0, off.width, off.height);
    var px = sd.data;
    for (var j = 0; j < px.length; j += 4) {
        var v = (px[j] * 0.299 + px[j + 1] * 0.587 + px[j + 2] * 0.114) < 160 ? 0 : 255;
        px[j] = px[j + 1] = px[j + 2] = v;
        px[j + 3] = 255;
    }
    oc.putImageData(sd, 0, 0);
    return off;
}

/* ── Clonar canvas offscreen ── */
function cloneOff(src) {
    var d = document.createElement('canvas');
    d.width = src.width;  d.height = src.height;
    d.getContext('2d').drawImage(src, 0, 0);
    return d;
}

/* ── Erosión morfológica: adelgaza trazos → preserva huecos de B, D, P… ── */
function erodeOff(src, r) {
    var w = src.width, h = src.height;
    var oc  = src.getContext('2d');
    var s   = oc.getImageData(0, 0, w, h);
    var dst = oc.createImageData(w, h);
    var sd  = s.data, dd = dst.data;

    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            var base = (y * w + x) * 4, hit = false;
            lp: for (var dy = -r; dy <= r; dy++) {
                for (var dx = -r; dx <= r; dx++) {
                    var ny = y + dy, nx = x + dx;
                    if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
                    if (sd[(ny * w + nx) * 4] > 128) { hit = true; break lp; }
                }
            }
            var v = hit ? 255 : 0;
            dd[base] = dd[base + 1] = dd[base + 2] = v;
            dd[base + 3] = 255;
        }
    }
    oc.putImageData(dst, 0, 0);
    return src;
}

/* ── Invertir colores (blanco ↔ negro) ── */
function invertOff(src) {
    var c = cloneOff(src);
    var oc = c.getContext('2d');
    var id = oc.getImageData(0, 0, c.width, c.height);
    var px = id.data;
    for (var i = 0; i < px.length; i += 4)
        px[i] = px[i + 1] = px[i + 2] = 255 - px[i];
    oc.putImageData(id, 0, 0);
    return c;
}

/* ============================================================
   SHAPE MATCHING (Vectores)
   ============================================================ */
function drawLetterTo100x100(letterStrokes) {
    var c = document.createElement('canvas');
    c.width = 100; c.height = 100;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,100,100);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    for (var i = 0; i < letterStrokes.length; i++) {
        var s = letterStrokes[i];
        if (!s || s.length === 0) continue;
        ctx.beginPath();
        ctx.moveTo(s[0][0], s[0][1]);
        for (var j = 1; j < s.length; j++) {
            ctx.lineTo(s[j][0], s[j][1]);
        }
        ctx.stroke();
    }
    return c;
}

function normalizeTo100x100(srcCanvas) {
    var w = srcCanvas.width, h = srcCanvas.height;
    var ctx = srcCanvas.getContext('2d');
    var data = ctx.getImageData(0,0,w,h).data;
    var minX = w, maxX = 0, minY = h, maxY = 0;
    var hasPixels = false;
    for(var y=0; y<h; y++){
        for(var x=0; x<w; x++){
            var i = (y*w + x)*4;
            if(data[i] < 128) {
                if(x < minX) minX = x; if(x > maxX) maxX = x;
                if(y < minY) minY = y; if(y > maxY) maxY = y;
                hasPixels = true;
            }
        }
    }
    var dst = document.createElement('canvas');
    dst.width = 100; dst.height = 100;
    var dctx = dst.getContext('2d');
    dctx.fillStyle = '#fff';
    dctx.fillRect(0,0,100,100);
    
    if(!hasPixels) return dst;
    
    var bw = maxX - minX + 1;
    var bh = maxY - minY + 1;
    var aspect = bw / bh;
    var sw, sh;
    
    if (aspect < 0.35 || aspect > 2.8) {
        var scale = Math.min(80 / bw, 80 / bh);
        sw = bw * scale;
        sh = bh * scale;
    } else {
        sw = 80;
        sh = 80;
    }
    
    var dx = 50 - sw / 2;
    var dy = 50 - sh / 2;
    
    dctx.drawImage(srcCanvas, minX, minY, bw, bh, dx, dy, sw, sh);
    return dst;
}

function computeDistanceTransform(imgData) {
    var px = imgData.data;
    var dist = new Float32Array(10000);
    var blackPixels = [];
    
    for(var y=0; y<100; y++) {
        for(var x=0; x<100; x++) {
            var idx = (y*100+x)*4;
            if( (px[idx]+px[idx+1]+px[idx+2]) < 600 ) {
                dist[y*100+x] = 0;
                blackPixels.push(y*100+x);
            } else {
                dist[y*100+x] = 999;
            }
        }
    }
    
    for(var y=0; y<100; y++) {
        for(var x=0; x<100; x++) {
            var i = y*100+x;
            if(dist[i] === 0) continue;
            var d = dist[i];
            if(x > 0) d = Math.min(d, dist[i-1] + 1);
            if(y > 0) d = Math.min(d, dist[i-100] + 1);
            dist[i] = d;
        }
    }
    for(var y=99; y>=0; y--) {
        for(var x=99; x>=0; x--) {
            var i = y*100+x;
            var d = dist[i];
            if(x < 99) d = Math.min(d, dist[i+1] + 1);
            if(y < 99) d = Math.min(d, dist[i+100] + 1);
            dist[i] = d;
        }
    }
    return { dist: dist, pixels: blackPixels };
}

var TEMPLATES = {};
function initTemplates() {
    for (var k in LETTERS_UPPER) {
        var raw = drawLetterTo100x100(LETTERS_UPPER[k]);
        var norm = normalizeTo100x100(raw);
        TEMPLATES[k] = computeDistanceTransform(norm.getContext('2d').getImageData(0,0,100,100));
    }
    for (var k in LETTERS_LOWER) {
        var raw = drawLetterTo100x100(LETTERS_LOWER[k]);
        var norm = normalizeTo100x100(raw);
        TEMPLATES[k] = computeDistanceTransform(norm.getContext('2d').getImageData(0,0,100,100));
    }
}
setTimeout(initTemplates, 500); // Async to not block initial load

function matchShape(base) {
    var normCanvas = normalizeTo100x100(base);
    var targetDT = computeDistanceTransform(normCanvas.getContext('2d').getImageData(0,0,100,100));

    if (targetDT.pixels.length === 0) return { text: '', confidence: 0, distance: 999 };

    var bestLetter = '';
    var bestDistance = 9999;

    for (var char in TEMPLATES) {
        var tmpl = TEMPLATES[char];
        if (tmpl.pixels.length === 0) continue;
        
        var sumT2U = 0;
        for(var i=0; i<tmpl.pixels.length; i++) {
            sumT2U += targetDT.dist[tmpl.pixels[i]];
        }
        var avgT2U = sumT2U / tmpl.pixels.length;
        
        var sumU2T = 0;
        for(var i=0; i<targetDT.pixels.length; i++) {
            sumU2T += tmpl.dist[targetDT.pixels[i]];
        }
        var avgU2T = sumU2T / targetDT.pixels.length;
        
        var totalDist = avgT2U + avgU2T;
        if (totalDist < bestDistance) {
            bestDistance = totalDist;
            bestLetter = char;
        }
    }
    var conf = Math.max(0, 100 - bestDistance * 5);
    return { text: bestLetter, confidence: conf, distance: bestDistance };
}

/* ============================================================
   RECONOCIMIENTO OCR (Tesseract.js)
   ============================================================ */
var WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúÁÉÍÓÚñÑ';

function cleanOCR(raw) {
    return raw.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s+/g, ' ').trim();
}

/* Lanza un intento de Tesseract con un PSM dado, devuelve { text, confidence } */
function tryRecognize(dataUrl, psm) {
    return new Promise(function (resolve) {
        var prom;
        try {
            prom = Tesseract.recognize(dataUrl, 'spa', {
                tessedit_char_whitelist:  WHITELIST,
                tessedit_pageseg_mode:    String(psm),
                tessedit_ocr_engine_mode: '1'
            });
        } catch (e) {
            prom = Tesseract.recognize(dataUrl, 'spa');
        }
        prom
            .then(function (res) {
                resolve({ text: cleanOCR(res.data.text), confidence: res.data.confidence || 0 });
            })
            .catch(function () {
                resolve({ text: '', confidence: 0 });
            });
    });
}

/*
  Reconocimiento principal:
  - 4 variantes de imagen × 2 PSMs + PSM 13 = 9 tareas en paralelo
  - Se elige el resultado con mayor confianza de Tesseract
*/
function recognizeDrawing() {
    if (!hasDrawn || busy) return;
    busy = true;

    statusBar.innerHTML = '<span class="spinner"></span> La IA está mirando…';
    statusBar.className = 'status-bar thinking';
    output.classList.add('empty');

    var base = buildBaseCanvas();
    if (!base) {
        busy = false;
        setStatus('Dibuja algo primero.', 'error');
        return;
    }

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
        // Distancia Chamfer: < 10 es un match casi perfecto
        if (shapeResult.distance < 12) {
            finalBest = shapeResult;
        } else if (bestTess.confidence > 65) {
            finalBest = bestTess;
        } else {
            finalBest = (shapeResult.confidence > bestTess.confidence) ? shapeResult : bestTess;
        }

        if (finalBest && finalBest.text) {
            output.textContent = finalBest.text;
            output.classList.remove('empty');
            setStatus('¡Lo adiviné! 🎉', 'success');
        } else {
            setStatus('No pude leerlo. ¡Escribe más grande!', 'error');
        }
    });
}
