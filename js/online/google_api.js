/* ============================================================
   google_api.js — Motor Principal Híbrido (Google Input Tools)
   ============================================================ */

async function askGoogleAPI(strokesData, w, h) {
    const url = "https://www.google.com.tw/inputtools/request?ime=handwriting&app=autofill&hl=es";
    const body = {
        options: "enable_pre_space",
        requests: [{
            writing_guide: { "width": w, "height": h },
            ink: strokesData,
            language: "es"
        }]
    };
    
    // Timeout de 2 segundos para fallback offline
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data[0] === "SUCCESS" && data[1] && data[1][0] && data[1][0][1]) {
            return data[1][0][1][0]; // Best candidate
        }
    } catch(err) {
        clearTimeout(timeoutId);
        console.warn("Google API failed or timeout, using offline fallback.", err);
    }
    return null;
}
