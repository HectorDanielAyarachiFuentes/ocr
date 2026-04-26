/* ============================================================
   geometry.js — Procesamiento de Canvas y Shape Matching
   ============================================================ */

/* ── PRE-PROCESAMIENTO DE IMAGEN ── */
function buildBaseCanvas(canvas, ctx) {
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

function cloneOff(src) {
    var d = document.createElement('canvas');
    d.width = src.width;  d.height = src.height;
    d.getContext('2d').drawImage(src, 0, 0);
    return d;
}

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

/* ── SHAPE MATCHING (Vectores) ── */
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
    
    if(!hasPixels) return { canvas: dst, aspect: 1 };
    
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
    return { canvas: dst, aspect: aspect };
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
        var normObj = normalizeTo100x100(raw);
        var dt = computeDistanceTransform(normObj.canvas.getContext('2d').getImageData(0,0,100,100));
        dt.aspect = normObj.aspect;
        TEMPLATES[k] = dt;
    }
    for (var k in LETTERS_LOWER) {
        var raw = drawLetterTo100x100(LETTERS_LOWER[k]);
        var normObj = normalizeTo100x100(raw);
        var dt = computeDistanceTransform(normObj.canvas.getContext('2d').getImageData(0,0,100,100));
        dt.aspect = normObj.aspect;
        TEMPLATES[k] = dt;
    }
    for (var k in VARIANTS) {
        var raw = drawLetterTo100x100(VARIANTS[k]);
        var normObj = normalizeTo100x100(raw);
        var dt = computeDistanceTransform(normObj.canvas.getContext('2d').getImageData(0,0,100,100));
        dt.aspect = normObj.aspect;
        TEMPLATES[k] = dt;
    }
}
setTimeout(initTemplates, 500); // Async to not block initial load

function matchShape(base) {
    var normObj = normalizeTo100x100(base);
    var targetDT = computeDistanceTransform(normObj.canvas.getContext('2d').getImageData(0,0,100,100));
    var targetAspect = normObj.aspect;

    if (targetDT.pixels.length === 0) return { text: '', confidence: 0, distance: 999, scores: {} };

    var bestLetter = '';
    var bestDistance = 9999;
    var scores = {};

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
        
        // Penalización por Ratio de Aspecto (Cuadrícula Invisible)
        var aspectDiff = Math.abs(Math.log(targetAspect) - Math.log(tmpl.aspect));
        var aspectPenalty = 0;
        if (aspectDiff > 0.7) {
            aspectPenalty = (aspectDiff - 0.7) * 20;
        }
        totalDist += aspectPenalty;
        
        var baseChar = char.split('_')[0];
        if (scores[baseChar] === undefined || totalDist < scores[baseChar]) {
            scores[baseChar] = totalDist;
        }

        if (totalDist < bestDistance) {
            bestDistance = totalDist;
            bestLetter = baseChar;
        }
    }
    var conf = Math.max(0, 100 - bestDistance * 5);
    return { text: bestLetter, confidence: conf, distance: bestDistance, scores: scores };
}
