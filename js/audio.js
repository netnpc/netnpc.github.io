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
    // 压缩器：让枪声更有"冲击力"而不破音
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 18;
    this.comp.ratio.value = 7;
    this.comp.attack.value = 0.002;
    this.comp.release.value = 0.18;
    this.master.connect(this.comp);
    this.comp.connect(this.ctx.destination);
    // 预生成噪声
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  noise(dur, { gain = 0.3, type = 'lowpass', freq = 1200, q = 1, decay = 0.9, freqEnd = null, delay = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, this.t + delay); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), this.t + delay + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t + delay);
    g.gain.exponentialRampToValueAtTime(gain, this.t + delay + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, this.t + delay + dur * decay);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(this.t + delay); src.stop(this.t + delay + dur + 0.02);
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

  // AK-47：清脆的"啪"裂响 + 中频枪身 + 低频膛压 + 短促回声尾
  rifle() {
    if (!this.ctx || !this.enabled) return;
    // 瞬态裂响（超短高频爆发）
    this.noise(0.03, { gain: 0.85, type: 'highpass', freq: 5200, decay: 1 });
    // 高频"嘶"层
    this.noise(0.09, { gain: 0.72, type: 'highpass', freq: 3000 });
    // 中频枪身（AK 特有的"哒"声）
    this.noise(0.18, { gain: 0.82, type: 'bandpass', freq: 660, q: 0.7, freqEnd: 200 });
    // 低频膛压冲击
    this.tone(110, 0.16, { gain: 0.8, type: 'triangle', freqEnd: 45 });
    this.tone(65, 0.26, { gain: 0.62, type: 'sine', freqEnd: 30 });
    // 枪机回位金属声（延迟 60ms 的机械脆响）
    this.noise(0.025, { gain: 0.4, type: 'highpass', freq: 4500, delay: 0.06, decay: 1 });
    // 短混响尾巴
    this.noise(0.36, { gain: 0.26, type: 'lowpass', freq: 1100, freqEnd: 140, delay: 0.05 });
  }
  // 沙漠之鹰 .50：更大的"轰"声，低音更重、尾音更长
  pistol() {
    if (!this.ctx || !this.enabled) return;
    // 瞬态
    this.noise(0.035, { gain: 1.2, type: 'highpass', freq: 4200, decay: 1 });
    // 中低频爆炸主体
    this.noise(0.26, { gain: 0.95, type: 'lowpass', freq: 1500, freqEnd: 150 });
    // .50 口径的重低音
    this.tone(90, 0.3, { gain: 0.7, type: 'sine', freqEnd: 32 });
    this.tone(170, 0.12, { gain: 0.3, type: 'square', freqEnd: 70 });
    // 套筒后坐金属声
    this.noise(0.03, { gain: 0.25, type: 'highpass', freq: 3800, delay: 0.05, decay: 1 });
    // 混响尾巴（比步枪更长）
    this.noise(0.55, { gain: 0.17, type: 'lowpass', freq: 900, freqEnd: 100, delay: 0.06 });
  }
  enemyShot(dist = 10) {
    if (!this.ctx || !this.enabled) return;
    const v = Math.max(0.06, 0.4 / (1 + dist * 0.18));
    this.noise(0.03, { gain: v * 1.4, type: 'highpass', freq: 4000, decay: 1 });
    this.noise(0.2, { gain: v, freq: 1500, freqEnd: 180 });
    this.tone(90, 0.14, { gain: v * 0.6, type: 'triangle', freqEnd: 40 });
    // 远处回声尾
    if (dist > 8) this.noise(0.4, { gain: v * 0.4, type: 'lowpass', freq: 700, freqEnd: 90, delay: 0.08 });
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
