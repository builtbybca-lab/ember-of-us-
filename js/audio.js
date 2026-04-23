/* ============================================
   EMBERS OF US — Procedural Ambient Audio
   Web Audio API: wind + soft piano tones
   ============================================ */

window.Audio = (function () {
    'use strict';

    let ctx = null;
    let masterGain = null;
    let windNode = null;
    let pianoNodes = [];
    let active = false;
    let initialized = false;

    const PIANO_NOTES = [
        220.00,   // A3
        261.63,   // C4
        293.66,   // D4
        329.63,   // E4
        392.00,   // G4
        440.00,   // A4
        523.25,   // C5
        587.33,   // D5
    ];

    function createWind(audioCtx, dest) {
        // White noise buffer
        const bufferSize = audioCtx.sampleRate * 4;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1);
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Low-pass filter for wind
        const lowpass = audioCtx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 320;
        lowpass.Q.value = 0.4;

        // Gain for wind volume
        const windGain = audioCtx.createGain();
        windGain.gain.value = 0;

        source.connect(lowpass);
        lowpass.connect(windGain);
        windGain.connect(dest);
        source.start();

        // Slow fade in
        windGain.gain.setValueAtTime(0, audioCtx.currentTime);
        windGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 3);

        return { source, gain: windGain };
    }

    function scheduleNote(audioCtx, dest, delay) {
        const freq = PIANO_NOTES[Math.floor(Math.random() * PIANO_NOTES.length)];
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + delay + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 4);

        oscillator.connect(gainNode);
        gainNode.connect(dest);
        oscillator.start(audioCtx.currentTime + delay);
        oscillator.stop(audioCtx.currentTime + delay + 4.5);

        pianoNodes.push(oscillator);

        // Schedule next note
        const nextDelay = 3 + Math.random() * 8;
        const timeout = setTimeout(() => {
            if (active) scheduleNote(audioCtx, dest, 0);
        }, (nextDelay) * 1000);
        pianoNodes.push(timeout);
    }

    function init() {
        if (initialized) return;
        initialized = true;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(ctx.destination);
    }

    function start() {
        init();
        if (active) return;
        active = true;

        if (ctx.state === 'suspended') ctx.resume();

        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);

        windNode = createWind(ctx, masterGain);

        // Start piano melody (staggered)
        for (let i = 0; i < 3; i++) {
            scheduleNote(ctx, masterGain, i * 2.5 + 1);
        }
    }

    function stop() {
        if (!active) return;
        active = false;

        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

        // Clear scheduled piano
        pianoNodes.forEach(n => {
            if (typeof n === 'number') clearTimeout(n);
        });
        pianoNodes = [];
    }

    function toggle() {
        if (active) {
            stop();
        } else {
            start();
        }
        return active;
    }

    return { toggle, start, stop };
})();
