// WebAudio procedural sound effects, no external audio assets
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
    // Compressor: gives gunshots more punch without clipping
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 18;
    this.comp.ratio.value = 7;
    this.comp.attack.value = 0.002;
    this.comp.release.value = 0.25;
    this.master.connect(this.comp);
    this.comp.connect(this.ctx.destination);
    // Outdoor reverb bus: the sense of space around a gunshot (without it, it sounds like a typewriter)
    this.verb = this.ctx.createConvolver();
    this.verb.buffer = this.makeImpulse(1.6, 2.6);
    this.verbIn = this.ctx.createGain();
    this.verbIn.gain.value = 0.55;
    this.verb.connect(this.verbIn); this.verbIn.connect(this.comp);
    // Pre-generated noise
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  }
  // Impulse response for an open outdoor space (noise + exponential decay, with a few early reflections)
  makeImpulse(dur = 1.6, decay = 2.6) {
    const sr = this.ctx.sampleRate, len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (ch ? 0.92 : 1);
      }
      // Early reflections (slap off a few walls; kept dense to avoid flutter echo)
      [0.008, 0.014, 0.021, 0.031, 0.042, 0.056, 0.073, 0.094, 0.121, 0.155].forEach((td, k) => {
        const idx = Math.floor(td * sr);
        if (idx < len) d[idx] += (0.42 - k * 0.032) * (1 - k * 0.07);
      });
      // Slightly heavy low end, which matches how a gunshot behaves in the open
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

  // AK-47: a real gunshot = broadband crack + a mid-low boom body + low-end muzzle pressure + a long tail,
  // Avoid a short "click" transient -- that is exactly what makes it sound like a typewriter
  rifle() {
    if (!this.ctx || !this.enabled) return;
    // Muzzle blast (10ms attack, wide but not piercing)
    this.noise(0.08, { gain: 1.1, type: 'highpass', freq: 2400, decay: 1, attack: 0.01, verb: 0.35 });
    // Broadband crack body (downward sweep)
    this.noise(0.2, { gain: 1.15, type: 'bandpass', freq: 2200, q: 0.3, freqEnd: 600, decay: 0.96, verb: 0.5 });
    // Mid-low body roar (long, slow decay -- the key to a boom rather than a snap)
    this.noise(0.55, { gain: 1.2, type: 'lowpass', freq: 1000, freqEnd: 130, decay: 0.9, verb: 0.7 });
    // Low-frequency muzzle pressure
    this.tone(120, 0.3, { gain: 1.05, type: 'triangle', freqEnd: 45, verb: 0.4 });
    this.tone(72, 0.5, { gain: 0.95, type: 'sine', freqEnd: 28, verb: 0.5 });
    // Distant tail (very slow decay, creates depth)
    this.noise(1.1, { gain: 0.3, type: 'lowpass', freq: 1200, freqEnd: 100, delay: 0.05, decay: 0.6 });
    // Mechanical sound only as a very light texture
    this.noise(0.02, { gain: 0.09, type: 'highpass', freq: 4200, delay: 0.12, decay: 1 });
  }
  // Desert Eagle .50AE: a large-bore boom, heavy sub + long tail
  pistol() {
    if (!this.ctx || !this.enabled) return;
    // Muzzle blast
    this.noise(0.08, { gain: 0.95, type: 'highpass', freq: 2200, decay: 1, attack: 0.01, verb: 0.4 });
    // Broadband blast body
    this.noise(0.26, { gain: 0.9, type: 'bandpass', freq: 1500, q: 0.38, freqEnd: 420, decay: 0.95, verb: 0.55 });
    // Mid-low explosion body (longer and heavier)
    this.noise(0.62, { gain: 1.0, type: 'lowpass', freq: 850, freqEnd: 110, decay: 0.88, verb: 0.75 });
    // Heavy sub for the .50 bore
    this.tone(95, 0.4, { gain: 0.8, type: 'sine', freqEnd: 28, verb: 0.45 });
    this.tone(55, 0.65, { gain: 0.6, type: 'sine', freqEnd: 24, verb: 0.55 });
    // Slide recoil (light, slightly delayed)
    this.noise(0.02, { gain: 0.1, type: 'highpass', freq: 3600, delay: 0.1, decay: 1 });
    // Long reverberation
    this.noise(1.3, { gain: 0.26, type: 'lowpass', freq: 900, freqEnd: 85, delay: 0.05, decay: 0.58 });
  }
  // Enemy gunfire: a real distant gunshot is not the same as a nearby one turned down in volume.
  // Physically, high frequencies decay in air far faster than low ones (roughly 6dB/km up to tens of dB/km, faster the higher the frequency),
  // so a distant shot loses almost all of its sharp snap and keeps only a mid thump plus a heavy low boom,
  // along with a clearly delayed echo (sound lags the bullet).
  // Distance drives three things at once: (1) overall attenuation, (2) a falling high-frequency cutoff, (3) longer and louder echo.
  enemyShot(dist = 10) {
    if (!this.ctx || !this.enabled) return;
    // (1) Distance attenuation: inverse square plus air absorption. The floor must not be too low or distant shots go silent entirely.
    const v = Math.max(0.10, 0.85 / (1 + dist * 0.16));
    // (2) High-frequency cutoff: about 6kHz at 3m, falling to about 900Hz at 40m.
    // Using 0.5^(dist/22): about 0.28x at 40m, which tracks the air absorption curve for highs.
    const hfCut = Math.max(900, 6000 * Math.pow(0.5, dist / 22));
    // (3) Propagation delay: 343 m/s, so about 117ms at 40m. Essentially zero up close.
    const arrive = Math.min(0.18, dist / 343);
    // Muzzle snap: short and sharp. The cutoff is hfCut itself rather than a multiple of it --
    // noise energy sits mostly in the low end, so a high high-pass filters the whole sound away (measured level was 0 at 4m).
    this.noise(0.05, { gain: v * 0.85, type: 'highpass', freq: hfCut * 0.85,
      decay: 1, attack: 0.005, delay: arrive, verb: 0.45 });
    // Body thump: a mid-band downward sweep with a little edge
    this.noise(0.16, { gain: v * 1.05, type: 'bandpass', freq: hfCut * 0.62, q: 0.55,
      freqEnd: hfCut * 0.22, decay: 0.95, delay: arrive, verb: 0.8, attack: 0.007 });
    // Low boom: the part that carries furthest, slow decay
    this.noise(0.5, { gain: v * 1.15, type: 'lowpass', freq: Math.min(1100, hfCut * 0.55),
      freqEnd: 120, decay: 0.88, delay: arrive, verb: 1.15 });
    // Low muzzle pressure: a controllable layer of weight under the boom
    this.tone(105, 0.26, { gain: v * 0.55, type: 'triangle', freqEnd: 40, delay: arrive, verb: 0.7 });
    // Ground / wall echo: a touch later than the direct sound, later and louder with distance (the strongest cue that someone is shooting far away)
    const echoD = arrive + Math.min(0.22, dist * 0.007);
    const echoG = v * Math.min(0.85, 0.30 + dist * 0.028);
    this.noise(0.75, { gain: echoG * 0.5, type: 'lowpass', freq: Math.max(500, hfCut * 0.45),
      freqEnd: 95, decay: 0.62, delay: echoD, verb: 1.5 });
    // Second echo (further and duller), which gives the arena depth
    if (dist > 10) {
      this.noise(0.9, { gain: echoG * 0.28, type: 'lowpass', freq: Math.max(380, hfCut * 0.32),
        freqEnd: 75, decay: 0.55, delay: echoD + Math.min(0.18, dist * 0.005), verb: 1.7 });
    }
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
