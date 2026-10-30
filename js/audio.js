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
    this.comp.release.value = 0.25;
    this.master.connect(this.comp);
    this.comp.connect(this.ctx.destination);
    // 室外混响总线：枪声的空间感（没有它就会像打字机）
    this.verb = this.ctx.createConvolver();
    this.verb.buffer = this.makeImpulse(1.6, 2.6);
    this.verbIn = this.ctx.createGain();
    this.verbIn.gain.value = 0.55;
    this.verb.connect(this.verbIn); this.verbIn.connect(this.comp);
    // 预生成噪声
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  }
  // 室外开阔地的脉冲响应（噪声 + 指数衰减，几处早期反射）
  makeImpulse(dur = 1.6, decay = 2.6) {
    const sr = this.ctx.sampleRate, len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (ch ? 0.92 : 1);
      }
      // 早期反射（几面墙的拍击，密集一些避免颤动回声）
      [0.008, 0.014, 0.021, 0.031, 0.042, 0.056, 0.073, 0.094, 0.121, 0.155].forEach((td, k) => {
        const idx = Math.floor(td * sr);
        if (idx < len) d[idx] += (0.42 - k * 0.032) * (1 - k * 0.07);
      });
      // 低频稍重一点，符合枪声在开阔地的表现
      let prev = 0;
      for (let i = 0; i < len; i++) { prev = prev * 0.86 + d[i] * 0.14; d[i] = prev; }
    }
    return buf;
  }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  noise(dur, { gain = 0.3, type = 'lowpass', freq = 1200, q = 1, decay = 0.9, freqEnd = null, delay = 0, attack = 0.004, verb = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, this.t + delay); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), this.t + delay + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t + delay);
    g.gain.exponentialRampToValueAtTime(gain, this.t + delay + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, this.t + delay + dur * decay);
    src.connect(f); f.connect(g); g.connect(this.master);
    if (verb > 0 && this.verb) {
      const vg = this.ctx.createGain(); vg.gain.value = verb;
      g.connect(vg); vg.connect(this.verb);
    }
    src.start(this.t + delay); src.stop(this.t + delay + dur + 0.02);
  }
  tone(freq, dur, { gain = 0.15, type = 'sine', freqEnd = null, delay = 0, verb = 0 } = {}) {
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
    if (verb > 0 && this.verb) {
      const vg = this.ctx.createGain(); vg.gain.value = verb;
      g.connect(vg); vg.connect(this.verb);
    }
    o.start(this.t + delay); o.stop(this.t + delay + dur + 0.02);
  }

  // AK-47：真实枪声 = 宽频爆裂 + 中低频"轰"体 + 低频膛压 + 长尾，
  // 避免短促的"咔哒"瞬态（那是打字机感的来源）
  rifle() {
    if (!this.ctx || !this.enabled) return;
    // 膛口冲击（10ms 起音，宽而不尖）
    this.noise(0.08, { gain: 1.1, type: 'highpass', freq: 2400, decay: 1, attack: 0.01, verb: 0.35 });
    // 宽频裂响主体（下扫）
    this.noise(0.2, { gain: 1.15, type: 'bandpass', freq: 2200, q: 0.3, freqEnd: 600, decay: 0.96, verb: 0.5 });
    // 中低频枪身轰鸣（长，慢衰减 —— 这是"轰"而非"啪"的关键）
    this.noise(0.55, { gain: 1.2, type: 'lowpass', freq: 1000, freqEnd: 130, decay: 0.9, verb: 0.7 });
    // 低频膛压
    this.tone(120, 0.3, { gain: 1.05, type: 'triangle', freqEnd: 45, verb: 0.4 });
    this.tone(72, 0.5, { gain: 0.95, type: 'sine', freqEnd: 28, verb: 0.5 });
    // 远处回响（衰减很慢，制造空间深度）
    this.noise(1.1, { gain: 0.3, type: 'lowpass', freq: 1200, freqEnd: 100, delay: 0.05, decay: 0.6 });
    // 机械声只作极轻微质感
    this.noise(0.02, { gain: 0.09, type: 'highpass', freq: 4200, delay: 0.12, decay: 1 });
  }
  // 沙漠之鹰 .50AE：大口径的"轰"，重低音 + 长尾
  pistol() {
    if (!this.ctx || !this.enabled) return;
    // 膛口冲击
    this.noise(0.08, { gain: 0.95, type: 'highpass', freq: 2200, decay: 1, attack: 0.01, verb: 0.4 });
    // 宽频爆响主体
    this.noise(0.26, { gain: 0.9, type: 'bandpass', freq: 1500, q: 0.38, freqEnd: 420, decay: 0.95, verb: 0.55 });
    // 中低频爆炸主体（更长更沉）
    this.noise(0.62, { gain: 1.0, type: 'lowpass', freq: 850, freqEnd: 110, decay: 0.88, verb: 0.75 });
    // .50 口径的重低音
    this.tone(95, 0.4, { gain: 0.8, type: 'sine', freqEnd: 28, verb: 0.45 });
    this.tone(55, 0.65, { gain: 0.6, type: 'sine', freqEnd: 24, verb: 0.55 });
    // 套筒后坐（轻微、延后）
    this.noise(0.02, { gain: 0.1, type: 'highpass', freq: 3600, delay: 0.1, decay: 1 });
    // 长回响
    this.noise(1.3, { gain: 0.26, type: 'lowpass', freq: 900, freqEnd: 85, delay: 0.05, decay: 0.58 });
  }
  enemyShot(dist = 10) {
    if (!this.ctx || !this.enabled) return;
    const v = Math.max(0.06, 0.45 / (1 + dist * 0.16));
    this.noise(0.06, { gain: v * 1.1, type: 'highpass', freq: 2400, decay: 1, attack: 0.01, verb: 0.5 });
    this.noise(0.45, { gain: v * 1.3, type: 'lowpass', freq: 950, freqEnd: 140, decay: 0.9, verb: 1.1 });
    this.tone(100, 0.28, { gain: v * 0.7, type: 'triangle', freqEnd: 36, verb: 0.6 });
    // 远处回声尾（距离越远，回声越显著）
    if (dist > 6) this.noise(1.0, { gain: v * 0.5, type: 'lowpass', freq: 650, freqEnd: 80, delay: 0.07, decay: 0.6 });
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
