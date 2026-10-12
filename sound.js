// Gestão de Efeitos Sonoros (Web Audio API) e Música Ambiente

export const SoundFX = (() => {
    let ctx = null, ativo = true, sfxPack = 'classic';
    function init() {
        if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ativo = false; } }
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    }
    function beep({ freq = 440, type = 'sine', duration = 0.12, gain = 0.15, delay = 0 }) {
        if (!ativo) return;
        init(); if (!ctx) return;
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now); osc.stop(now + duration + 0.02);
    }
    const P = {
        click: { freq: 600, type: 'triangle', duration: 0.05, gain: 0.06 },
        select: { freq: 880, type: 'sine', duration: 0.08, gain: 0.08 },
        moveA: { freq: 320, type: 'triangle', duration: 0.08, gain: 0.10 },
        moveB: { freq: 480, type: 'sine', duration: 0.10, gain: 0.08, delay: 0.05 },
        captureA: { freq: 220, type: 'sawtooth', duration: 0.10, gain: 0.10 },
        captureB: { freq: 160, type: 'square', duration: 0.14, gain: 0.08, delay: 0.08 },
        king: [{ freq: 523, type: 'sine', duration: 0.10, gain: 0.10 }, { freq: 659, type: 'sine', duration: 0.10, gain: 0.10, delay: 0.10 }, { freq: 784, type: 'sine', duration: 0.16, gain: 0.12, delay: 0.20 }],
        win: [{ freq: 523, type: 'sine', duration: 0.18, gain: 0.12 }, { freq: 659, type: 'sine', duration: 0.18, gain: 0.12, delay: 0.13 }, { freq: 784, type: 'sine', duration: 0.18, gain: 0.12, delay: 0.26 }, { freq: 1046, type: 'sine', duration: 0.22, gain: 0.13, delay: 0.39 }],
        lose: [{ freq: 440, type: 'triangle', duration: 0.20, gain: 0.11 }, { freq: 392, type: 'triangle', duration: 0.20, gain: 0.11, delay: 0.15 }, { freq: 330, type: 'triangle', duration: 0.20, gain: 0.11, delay: 0.30 }, { freq: 262, type: 'triangle', duration: 0.24, gain: 0.11, delay: 0.45 }],
        notify: [{ freq: 740, type: 'sine', duration: 0.09, gain: 0.09 }, { freq: 880, type: 'sine', duration: 0.11, gain: 0.09, delay: 0.09 }],
        error: { freq: 200, type: 'square', duration: 0.16, gain: 0.10 },
        chat: [{ freq: 980, type: 'sine', duration: 0.06, gain: 0.07 }, { freq: 1240, type: 'sine', duration: 0.09, gain: 0.07, delay: 0.06 }],
        achievement: [{ freq: 659, type: 'sine', duration: 0.12, gain: 0.11 }, { freq: 880, type: 'sine', duration: 0.12, gain: 0.11, delay: 0.12 }, { freq: 1046, type: 'sine', duration: 0.12, gain: 0.11, delay: 0.24 }, { freq: 1318, type: 'sine', duration: 0.22, gain: 0.12, delay: 0.36 }],
        tick: { freq: 1100, type: 'triangle', duration: 0.04, gain: 0.06 },
        timeout: [{ freq: 400, type: 'triangle', duration: 0.14, gain: 0.10 }, { freq: 300, type: 'triangle', duration: 0.14, gain: 0.10, delay: 0.14 }, { freq: 220, type: 'triangle', duration: 0.18, gain: 0.10, delay: 0.28 }, { freq: 160, type: 'triangle', duration: 0.30, gain: 0.11, delay: 0.46 }],
        alert5s: [{ freq: 880, type: 'triangle', duration: 0.22, gain: 0.22 }, { freq: 700, type: 'triangle', duration: 0.26, gain: 0.22, delay: 0.24 }],
        pause: [{ freq: 600, type: 'triangle', duration: 0.12, gain: 0.09 }, { freq: 480, type: 'triangle', duration: 0.16, gain: 0.09, delay: 0.12 }],
        unpause: [{ freq: 480, type: 'triangle', duration: 0.12, gain: 0.09 }, { freq: 700, type: 'triangle', duration: 0.16, gain: 0.09, delay: 0.12 }],
        empate: [{ freq: 523, type: 'triangle', duration: 0.18, gain: 0.10 }, { freq: 392, type: 'triangle', duration: 0.28, gain: 0.10, delay: 0.16 }]
    };
    function play(cfg) { if (Array.isArray(cfg)) cfg.forEach(c => beep(c)); else beep(cfg); }
    return {
        get ativo() { return ativo; },
        setPack(p) { sfxPack = p; },
        toggle() { ativo = !ativo; if (ativo) { init(); this.click(); } return ativo; },
        click() { play(P.click); }, select() { play(P.select); },
        move() { beep(P.moveA); beep(P.moveB); },
        capture() { beep(P.captureA); beep(P.captureB); },
        king() { play(P.king); }, win() { play(P.win); }, lose() { play(P.lose); },
        notify() { play(P.notify); }, error() { play(P.error); },
        chat() { play(P.chat); }, achievement() { play(P.achievement); },
        tick() { play(P.tick); }, timeout() { play(P.timeout); },
        alert5s() { play(P.alert5s); },
        pause() { play(P.pause); }, unpause() { play(P.unpause); },
        empate() { play(P.empate); }
    };
})();

export const MusicaFundo = (() => {
    let ctx = null, masterGain = null, timerId = null, tocando = false, ativa = false;
    const acordes = [[220.00, 261.63, 329.63], [174.61, 220.00, 261.63], [130.81, 164.81, 196.00], [196.00, 246.94, 293.66]];
    let acordeIdx = 0;
    function init() {
        if (!ctx) {
            try {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
                masterGain = ctx.createGain(); masterGain.gain.value = 0.045; masterGain.connect(ctx.destination);
            } catch (e) { return false; }
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return true;
    }
    function tocaAcorde(freqs, duracao = 3.2) {
        if (!ctx || !masterGain) return;
        const now = ctx.currentTime;
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = i === 0 ? 'triangle' : 'sine'; osc.frequency.value = f;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.14, now + 0.6);
            g.gain.exponentialRampToValueAtTime(0.0001, now + duracao);
            osc.connect(g); g.connect(masterGain);
            osc.start(now); osc.stop(now + duracao + 0.1);
        });
    }
    function tocaNotaMelodia() {
        if (!ctx || !masterGain) return;
        const escala = [523.25, 587.33, 659.25, 783.99, 880.00];
        const f = escala[Math.floor(Math.random() * escala.length)];
        const now = ctx.currentTime;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.08, now + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc.connect(g); g.connect(masterGain);
        osc.start(now); osc.stop(now + 1.5);
    }
    function loop() {
        if (!tocando) return;
        tocaAcorde(acordes[acordeIdx % acordes.length], 3.2);
        setTimeout(() => { if (tocando) tocaNotaMelodia(); }, 1400);
        acordeIdx++;
        timerId = setTimeout(loop, 3000);
    }
    return {
        get tocando() { return tocando; },
        toggle() { ativa = !ativa; if (ativa) this.start(); else this.stop(); return ativa; },
        start() { if (tocando) return; if (!init()) { ativa = false; return; } tocando = true; acordeIdx = 0; loop(); },
        stop() { tocando = false; if (timerId) { clearTimeout(timerId); timerId = null; } }
    };
})();
