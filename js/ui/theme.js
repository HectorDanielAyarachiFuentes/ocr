/* =============================================================
   theme.js — Lógica para Tema Claro / Oscuro (Dark Mode)
   ============================================================= */

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Actualizar todos los botones de tema en la pantalla
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.innerHTML = isDark ? '<i class="ph-fill ph-sun"></i>' : '<i class="ph-fill ph-moon"></i>';
        btn.style.color = isDark ? '#FBBF24' : '#A78BFA';
    });
}

// Cargar el tema guardado o la preferencia del sistema al inicio
(function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
    }
})();

// Esperar al DOM para actualizar los iconos iniciales
document.addEventListener('DOMContentLoaded', () => {
    const isDark = document.body.classList.contains('dark-mode');
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.innerHTML = isDark ? '<i class="ph-fill ph-sun"></i>' : '<i class="ph-fill ph-moon"></i>';
        btn.style.color = isDark ? '#FBBF24' : '#A78BFA';
    });
});
