// ==================== 音效系统（Web Audio API） ====================

let audioCtx = null;
let bgMusicNode = null;
let bgMusicGain = null;

export function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    startBackgroundMusic();
}

// 射击音效 - 更真实的枪声
export function playShootSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 0.1;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, audioCtx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
    noise.stop(audioCtx.currentTime + 0.1);
}

// 气球爆裂音效 - 更真实的爆裂声
export function playBalloonPopSound() {
    if (!audioCtx) return;
    // 低频爆裂
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
    gain1.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.2);

    // 高频撕裂声
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(2000, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start();
    osc2.stop(audioCtx.currentTime + 0.15);
}

// 背景音乐 - 简单的和弦循环 (C-Dm-F-G)
function startBackgroundMusic() {
    if (!audioCtx || bgMusicNode) return;

    bgMusicGain = audioCtx.createGain();
    bgMusicGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    bgMusicGain.connect(audioCtx.destination);

    const chords = [
        [261.63, 329.63, 392.00], // C major
        [293.66, 369.99, 440.00], // D minor
        [349.23, 440.00, 523.25], // F major
        [392.00, 493.88, 587.33]  // G major
    ];

    let chordIndex = 0;

    function playChord() {
        if (!bgMusicGain) return;

        const chord = chords[chordIndex % chords.length];
        chord.forEach(freq => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
            osc.connect(gain);
            gain.connect(bgMusicGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 2);
        });

        chordIndex++;
        if (bgMusicNode) {
            bgMusicNode = setTimeout(playChord, 2000);
        }
    }

    bgMusicNode = setTimeout(playChord, 500);
}

export function stopBackgroundMusic() {
    if (bgMusicNode) {
        clearTimeout(bgMusicNode);
        bgMusicNode = null;
    }
    if (bgMusicGain) {
        bgMusicGain.gain.setValueAtTime(0, audioCtx.currentTime);
        bgMusicGain = null;
    }
}
