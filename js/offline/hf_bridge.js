/* hf_bridge.js - Puente para HuggingFace transformers.js */
import { pipeline, env } from './transformers.js';

// Optimizar para uso en navegador y modo offline
env.allowLocalModels = false;
env.useBrowserCache = true;

window.HF_OCR = {
    isReady: false,
    isInitializing: false,
    recognizer: null,
    
    init: async function() {
        if (this.isReady || this.isInitializing) return;
        this.isInitializing = true;
        
        let statusBar = document.getElementById('statusBar');
        if (statusBar && !this.isReady) {
            statusBar.innerHTML = '<span class="spinner"></span> Descargando/Cargando IA Offline (Transformers.js)...';
            statusBar.className = 'status-bar thinking';
        }

        try {
            // Cargar pipeline. La primera vez descargará el modelo.
            this.recognizer = await pipeline('image-to-text', 'Xenova/trocr-small-handwritten');
            this.isReady = true;
            console.log("HuggingFace TrOCR cargado y listo (offline caching activado).");
            
            if (statusBar) {
                statusBar.innerHTML = 'IA Offline lista.';
                statusBar.className = 'status-bar';
            }
        } catch (err) {
            console.error("Error inicializando TrOCR:", err);
            if (statusBar) {
                statusBar.innerHTML = 'Error al cargar IA Offline.';
                statusBar.className = 'status-bar error';
            }
        }
        this.isInitializing = false;
    },
    
    recognize: async function(imageUrl) {
        if (!this.isReady) {
            await this.init();
        }
        if (!this.recognizer) return null;
        
        try {
            // El pipeline espera una URL de imagen o un objeto de imagen.
            let result = await this.recognizer(imageUrl);
            // El resultado es un array de objetos, ej: [{ generated_text: 'Hello' }]
            if (result && result.length > 0 && result[0].generated_text) {
                return result[0].generated_text.trim();
            }
        } catch (err) {
            console.error("Error en inferencia TrOCR:", err);
        }
        return null;
    }
};

// Iniciar la descarga/carga en background tan pronto se cargue el script
window.addEventListener('DOMContentLoaded', () => {
    window.HF_OCR.init();
});
