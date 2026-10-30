// WebAudio 程序化音效，无外部音频资源
export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this.noiseBuf = null;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // 预生成噪声
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  noise(dur, { gain = 0.3, type = 'lowpass', freq = 1200, q = 1, decay = 0.9, freqEnd = null } = {}) {
    if (!this.ctx || !this.enabled) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, this.t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), this.t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.t);
    g.gain.exponentialRampToValueAtTime(0.0008, this.t + dur * decay);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(this.t); src.stop(this.t + dur + 0.02);
  }
  tone(freq, dur, { gain = 0.15, type = 'sine', freqEnd = null, delay = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.t + delay);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), this.t + delay + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t + delay);
    g.gain.exponentialRampToValueAtTime(gain, this.t + delay + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0006, this.t + delay + dur);
    o.connect(g); g.connect(this.master);
    o.start(this.t + delay); o.stop(this.t + delay + dur + 0.02);
  }

  rifle() {
    if (!this.ctx || !this.enabled) return;
    this.noise(0.22, { gain: 0.55, freq: 2600, freqEnd: 260, q: 0.7 });
    this.noise(0.09, { gain: 0.3, type: 'highpass', freq: 3400 });
    this.tone(120, 0.16, { gain: 0.35, type: 'triangle', freqEnd: 42 });
    this.tone(70, 0.26, { gain: 0.28, type: 'sine', freqEnd: 30 });
  }
  pistol() {
    if (!this.ctx || !this.enabled) return;
    this.noise(0.15, { gain: 0.4, freq: 2200, freqEnd: 340 });
    this.tone(180, 0.1, { gain: 0.25, type: 'square', freqEnd: 60 });
  }
  enemyShot(dist = 10) {
    if (!this.ctx || !this.enabled) return;
    const v = Math.max(0.06, 0.4 / (1 + dist * 0.18));
    this.noise(0.2, { gain: v, freq: 1500, freqEnd: 180 });
    this.tone(90, 0.14, { gain: v * 0.6, type: 'triangle', freqEnd: 40 });
  }
  hit(head = false) {
    this.noise(0.07, { gain: 0.28, type: 'bandpass', freq: head ? 2400 : 1500, q: 1.5 });
    this.tone(head ? 1250 : 760, 0.07, { gain: 0.16, type: 'square', freqEnd: head ? 700 : 420 });
  }
  kill() {
    this.tone(520, 0.1, { gain: 0.16, type: 'triangle' });
    this.tone(780, 0.14, { gain: 0.14, type: 'triangle', delay: 0.08 });
    this.tone(1040, 0.2, { gain: 0.1, type: 'sine', delay: 0.16 });
  }
  hurt() {
    this.noise(0.3, { gain: 0.32, freq: 700, freqEnd: 120 });
    this.tone(160, 0.25, { gain: 0.16, type: 'sawtooth', freqEnd: 60 });
  }
  reload() {
    this.noise(0.06, { gain: 0.22, type: 'highpass', freq: 2000 });
    setTimeout(() => this.noise(0.05, { gain: 0.2, type: 'highpass', freq: 2600 }), 260);
    setTimeout(() => { this.noise(0.09, { gain: 0.25, type: 'bandpass', freq: 900, q: 2 }); this.tone(300, 0.06, { gain: 0.1, type: 'square' }); }, 620);
  }
  empty() {
    this.noise(0.04, { gain: 0.2, type: 'highpass', freq: 3000 });
  }
  step() {
    this.noise(0.07, { gain: 0.06, type: 'lowpass', freq: 420 });
  }
  jump() { this.noise(0.1, { gain: 0.05, type: 'lowpass', freq: 300 }); }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.34, { gain: 0.13, type: 'triangle', delay: i * 0.13 }));
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.42, { gain: 0.13, type: 'sine', delay: i * 0.16 }));
  }
  waveStart() {
    [330, 440, 554, 660].forEach((f, i) => this.tone(f, 0.2, { gain: 0.11, type: 'square', delay: i * 0.07 }));
  }
}
