/* ============================================================
   dtw_bridge.js — Puente entre app.js y transformers.js (DTW)
   Adapta los trazos del canvas al formato que espera matchDTW().
   NO modifica transformers.js — solo lo consume.
   ============================================================ */

/* ── Estado global del puente ── */
var DTW_BRIDGE = {
    lastResult:  null,   // Último resultado DTW
    isAvailable: false,  // true si transformers.js está cargado
    version:     '1.0.0'
};

/* ── Detectar si transformers.js está disponible ── */
(function detectDTW() {
    if (typeof matchDTW === 'function' && typeof buildStrokeDB === 'function') {
        DTW_BRIDGE.isAvailable = true;
        console.info('[DTW Bridge] transformers.js detectado ✓');
    } else {
        console.warn('[DTW Bridge] transformers.js NO detectado — reconocimiento offline DTW desactivado.');
    }
})();

/* ============================================================
   normalizeStrokesToCanvas
   Convierte los trazos absolutos del canvas (píxeles) a
   coordenadas normalizadas 0–100, igual que la base de datos
   de letras en transformers.js.
   ============================================================ */
function normalizeStrokesToCanvas(strokesData, canvasWidth, canvasHeight) {
    if (!strokesData || strokesData.length === 0) return [];

    /* Calcular bounding box global entre todos los trazos */
    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;

    strokesData.forEach(function(s) {
        var xs = s[0], ys = s[1];
        for (var i = 0; i < xs.length; i++) {
            if (xs[i] < minX) minX = xs[i];
            if (xs[i] > maxX) maxX = xs[i];
            if (ys[i] < minY) minY = ys[i];
            if (ys[i] > maxY) maxY = ys[i];
        }
    });

    var rangeX = maxX - minX || 1;
    var rangeY = maxY - minY || 1;
    var scale  = Math.max(rangeX, rangeY);

    /* Escala uniforme preservando aspecto (igual que dtwNormalize) */
    return strokesData.map(function(s) {
        var xs = s[0], ys = s[1];
        return [
            xs.map(function(v) { return ((v - minX) / scale) * 90 + 5; }),
            ys.map(function(v) { return ((v - minY) / scale) * 90 + 5; }),
            s[2] // timestamps sin cambio
        ];
    });
}

/* ============================================================
   dtwRecognize(strokesData, canvasWidth, canvasHeight)
   Punto de entrada principal del puente.
   strokesData: array en formato app.js → [ [x[], y[], t[]], … ]
   Retorna: { text, confidence, distance, scores, engine } | null
   ============================================================ */
function dtwRecognize(strokesData, canvasWidth, canvasHeight) {
    if (!DTW_BRIDGE.isAvailable) {
        console.warn('[DTW Bridge] matchDTW no disponible.');
        return null;
    }

    if (!strokesData || strokesData.length === 0) {
        console.warn('[DTW Bridge] Sin trazos para reconocer.');
        return null;
    }

    /* Filtrar trazos vacíos o con un solo punto */
    var validStrokes = strokesData.filter(function(s) {
        return s[0] && s[0].length > 1;
    });

    if (validStrokes.length === 0) {
        console.warn('[DTW Bridge] Todos los trazos son inválidos (< 2 puntos).');
        return null;
    }

    /* Normalizar al espacio 0-100 del motor DTW */
    var normalized = normalizeStrokesToCanvas(validStrokes, canvasWidth, canvasHeight);

    /* Llamar al motor DTW de transformers.js */
    var result = null;
    try {
        result = matchDTW(normalized);
    } catch (err) {
        console.error('[DTW Bridge] Error al llamar matchDTW:', err);
        return null;
    }

    if (!result) return null;

    /* Enriquecer el resultado con metadatos del puente */
    result.engine      = 'DTW-offline';
    result.strokeCount = validStrokes.length;

    DTW_BRIDGE.lastResult = result;
    console.log('[DTW Bridge] Resultado:', result.text,
                '| confianza:', result.confidence + '%',
                '| dist:', result.distance.toFixed(4));

    return result;
}

/* ============================================================
   dtwQuickCheck(char, strokesData, canvasWidth, canvasHeight)
   Consulta rápida: ¿cuán bien coincide un trazo con un carácter?
   Útil para validación cruzada con Google API.
   Retorna: número de distancia (menor = mejor coincidencia)
   ============================================================ */
function dtwQuickCheck(char, strokesData, canvasWidth, canvasHeight) {
    if (!DTW_BRIDGE.isAvailable || !strokesData || strokesData.length === 0) return Infinity;

    var result = dtwRecognize(strokesData, canvasWidth, canvasHeight);
    if (!result || !result.scores) return Infinity;

    /* Buscar el score del carácter pedido (mayúscula o minúscula) */
    var score = result.scores[char];
    if (score === undefined) {
        var alt = (char === char.toLowerCase()) ? char.toUpperCase() : char.toLowerCase();
        score = result.scores[alt];
    }
    return score !== undefined ? score : Infinity;
}
