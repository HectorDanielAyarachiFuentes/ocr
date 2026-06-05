/* =============================================================
   audio.js — Motor de Sonido y Voz (Text-to-Speech)
   ============================================================= */

/* ── Motor de Sonido (SFX) ── */
var audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

var SFX = {
    playDing: function() {
        initAudio();
        var osc = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
    },
    playPop: function() {
        initAudio();
        var osc = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
    }
};

// Sonido de pop en todos los botones
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        SFX.playPop();
    }
});

/* ── Motor de Voz (Text-to-Speech) ── */
function speakText(text) {
    if (!text) return;
    window.speechSynthesis.cancel(); // Cancela cualquier audio previo en la cola
    const mensaje = new SpeechSynthesisUtterance(text);
    mensaje.lang = 'es-ES';
    mensaje.rate = 1;
    window.speechSynthesis.speak(mensaje);
}

/* ── Repetir audio de la letra actual ── */
function replaySpeech() {
    const char = currentLetterChar();
    if (char) {
        speakText(char);
    }
}
