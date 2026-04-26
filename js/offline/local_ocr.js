/* ============================================================
   local_ocr.js — Motor de Respaldo (Tesseract.js)
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
