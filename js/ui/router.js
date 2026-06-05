/* ============================================================
   router.js — Enrutador SPA ligero
   ============================================================ */

window.addEventListener('DOMContentLoaded', function() {
    function handleRoute() {
        const hash = window.location.hash || '#draw';
        
        const viewDraw = document.getElementById('view-draw');
        const viewLearn = document.getElementById('view-learn');

        if (hash === '#learn') {
            viewDraw.classList.remove('active');
            viewLearn.classList.add('active');
            
            // Reajustar canvases de learn
            if (window.learnContext && window.learnContext.resizeCanvases) {
                window.learnContext.resizeCanvases();
            }
        } else {
            viewLearn.classList.remove('active');
            viewDraw.classList.add('active');
            
            // Reajustar canvas de draw
            if (window.appContext && window.appContext.resizeCanvas) {
                window.appContext.resizeCanvas();
            }
        }
    }

    // Escuchar cambios de hash
    window.addEventListener('hashchange', handleRoute);
    
    // Ejecutar ruta inicial
    handleRoute();
});
