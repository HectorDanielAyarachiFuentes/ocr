/* hf_bridge.js - Puente para HuggingFace transformers.js */
import { pipeline, env } from './transformers.js';

// 🚀 MODO 100% LOCAL Y OFFLINE ACTIVADO
env.allowLocalModels = true; // Permite buscar en la carpeta local
env.localModelPath = './models/'; // Le decimos dónde está la carpeta base
env.allowRemoteModels = false; // Apagamos la descarga de internet
env.useBrowserCache = false; // Ya no hace falta caché porque está en el disco local

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
            // Cargar pipeline con callback de progreso para ver la descarga
            this.recognizer = await pipeline('image-to-text', 'Xenova/trocr-small-printed', {
                progress_callback: (info) => {
                    if (statusBar && info.status === 'progress') {
                        // info.progress es el porcentaje (0 a 100)
                        let percent = Math.round(info.progress);
                        statusBar.innerHTML = '<span class="spinner"></span> Descargando IA (' + percent + '%)... Puede tardar un poco la primera vez.';
                    } else if (statusBar && info.status === 'done') {
                        statusBar.innerHTML = '<span class="spinner"></span> Cargando en memoria...';
                    }
                }
            });
            this.isReady = true;
            console.log("HuggingFace TrOCR cargado y listo (offline caching activado).");
            
            if (statusBar) {
                statusBar.innerHTML = '✨ Usando IA <b style="color: #22c55e;">Online</b> (Respaldo Offline listo por si falla internet).';
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
            if (result && result.length > 0 && result[0].generated_text) {
                let rawText = result[0].generated_text.trim();
                console.log("TrOCR predicción cruda:", rawText);
                
                // Filtro: buscar letras y números, permitiendo palabras completas
                // Eliminamos caracteres extraños al inicio o final, pero dejamos la palabra
                let cleanedText = rawText.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim();
                
                if (cleanedText) {
                    // Retornar la palabra completa en mayúsculas para mejor visualización
                    return cleanedText.toUpperCase();
                }
                
                return rawText ? rawText.toUpperCase() : null;
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
