// 输入：键盘 / 鼠标（Pointer Lock）/ 触摸（虚拟摇杆 + 滑动视角 + 开火）
export class Input {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    this.firing = false;
    this.moveX = 0;      // -1..1 摇杆
    this.moveY = 0;
    this.wantReload = false;
    this.wantJump = false;
    this.wantSwitch = false;
    this.wantCrouch = false;
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.locked = false;
    this.enabled = false;
    this.onPause = opts.onPause || (() => {});
    this.sens = 1;

    // 触摸状态
    this.stickId = null;
    this.stickCX = 0; this.stickCY = 0; this.stickBaseR = 60;
    this.lookId = null;
    this.lookLX = 0; this.lookLY = 0;
    this.stickBase = document.getElementById('stickBase');
    this.stickKnob = document.getElementById('stickKnob');
    this.btnFire = document.getElementById('btnFire');

    this.bindKeyboard();
    this.bindMouse();
    this.bindTouch();
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const k = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ControlLeft', 'KeyR', 'Digit1', 'Digit2', 'KeyC'].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === 'KeyR') this.wantReload = true;
      if (k === 'Space') this.wantJump = true;
      if (k === 'Digit1' || k === 'Digit2' || k === 'KeyQ') this.wantSwitch = true;
      if (k === 'ControlLeft' || k === 'KeyC') this.wantCrouch = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'ControlLeft' || e.code === 'KeyC') this.wantCrouch = false;
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.firing = false; });
  }

  bindMouse() {
    this.ads = false;
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || !this.isDesktopPointer) return;
      if (e.button === 0) this.firing = true;
      if (e.button === 2) this.ads = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.firing = false;
      if (e.button === 2) this.ads = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      const s = 0.0022 * this.sens;
      this.lookDX += e.movementX * s;
      this.lookDY += e.movementY * s;
    });
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.wantSwitch = true;
    }, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked && this.enabled && !this.isTouch) this.onPause();
    });
  }

  get isDesktopPointer() {
    return !this.isTouch || window.matchMedia('(pointer:fine)').matches;
  }

  requestLock() {
    if (this.isTouch) return;
    const p = this.canvas.requestPointerLock?.({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => this.canvas.requestPointerLock());
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  bindTouch() {
    const stickZone = document.getElementById('stickZone');
    // 触屏灵敏度系数：竖屏时视野纵向更"窄"，需要更高的补偿，否则上下看很吃力
    this._touchBase = 0.0052;

    // ---- 摇杆（仅左下触发区） ----
    stickZone.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (this.stickId !== null) return;
      this.stickId = t.identifier;
      this.stickCX = t.clientX; this.stickCY = t.clientY;
      if (this.stickBase) {
        this.stickBase.style.left = t.clientX + 'px';
        this.stickBase.style.top = t.clientY + 'px';
        this.stickBase.style.bottom = 'auto';
        this.stickBase.style.margin = '-59px 0 0 -59px';
        this.stickBase.classList.add('active');
      }
      this.updateStick(t.clientX, t.clientY);
    }, { passive: false });

    // ---- 视角滑动：全局监听，任意位置（除摇杆/按钮）都可拖动转身与俯仰 ----
    const onStart = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) continue;
        // 落在按钮上的触摸交给按钮自己处理
        if (this._isUI(t.clientX, t.clientY)) continue;
        if (this.lookId === null) {
          this.lookId = t.identifier;
          this.lookLX = t.clientX;
          this.lookLY = t.clientY;
        }
      }
    };
    const onMove = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          e.preventDefault();
          this.updateStick(t.clientX, t.clientY);
        } else if (t.identifier === this.lookId) {
          e.preventDefault();
          const dx = t.clientX - this.lookLX;
          const dy = t.clientY - this.lookLY;
          this.lookLX = t.clientX;
          this.lookLY = t.clientY;
          // 单帧跳跃过大（跨帧丢事件）时钳制，避免视角瞬间甩飞
          const cap = 140;
          const cd = Math.max(-cap, Math.min(cap, dx));
          const cdy = Math.max(-cap, Math.min(cap, dy));
          const s = this._touchBase * this.sens;
          this.lookDX += cd * s;
          this.lookDY += cdy * s;
        }
      }
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          this.stickId = null;
          this.moveX = 0; this.moveY = 0;
          if (this.stickBase) this.stickBase.classList.remove('active');
          if (this.stickKnob) this.stickKnob.style.transform = 'translate(0,0)';
        }
        if (t.identifier === this.lookId) this.lookId = null;
      }
    };
    // window + document 双绑，兼容部分 WebView 不冒泡到 window 的情况
    window.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);

    // 开火按钮
    const fireOn = (e) => { e.preventDefault(); e.stopPropagation(); if (this.enabled) this.firing = true; };
    const fireOff = (e) => { e.preventDefault(); this.firing = false; };
    if (this.btnFire) {
      this.btnFire.addEventListener('touchstart', fireOn, { passive: false });
      this.btnFire.addEventListener('touchend', fireOff, { passive: false });
      this.btnFire.addEventListener('touchcancel', fireOff, { passive: false });
      this.btnFire.addEventListener('mousedown', fireOn);
      window.addEventListener('mouseup', fireOff);
    }
    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = (e) => { e.preventDefault(); e.stopPropagation(); if (this.enabled) fn(); };
      el.addEventListener('touchstart', handler, { passive: false });
      el.addEventListener('mousedown', handler);
    };
    bindBtn('btnReload', () => { this.wantReload = true; });
    bindBtn('btnJump', () => { this.wantJump = true; });
    bindBtn('btnSwitch', () => { this.wantSwitch = true; });
  }

  // 判断屏幕坐标是否落在可交互按钮上（这些位置的触摸不再用于转身）
  _isUI(x, y) {
    const cache = this._uiCache;
    const now = performance.now();
    if (!cache || now - cache.t > 800) {
      const ids = ['btnFire', 'btnReload', 'btnJump', 'btnSwitch', 'btnPause', 'btnSound'];
      const rects = [];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el || el.offsetParent === null) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0) rects.push(r);
      }
      this._uiCache = { t: now, rects };
    }
    for (const r of this._uiCache.rects) {
      if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6) return true;
    }
    return false;
  }

  updateStick(x, y) {
    const dx = x - this.stickCX, dy = y - this.stickCY;
    const R = this.stickBaseR;
    const d = Math.hypot(dx, dy);
    const k = d > R ? R / d : 1;
    const nx = dx * k, ny = dy * k;
    this.moveX = nx / R;
    this.moveY = ny / R;
    if (this.stickKnob) this.stickKnob.style.transform = `translate(${nx * 0.75}px,${ny * 0.75}px)`;
  }

  // 每帧读取并清空增量
  consumeLook() {
    const dx = this.lookDX, dy = this.lookDY;
    this.lookDX = 0; this.lookDY = 0;
    return { dx, dy };
  }

  /**
   * 根据屏幕的高度像素为触屏设置滑动灵敏度。
   * 竖屏时虽然视野垂直角度不变，但同样的手指位移对应的"行数"更少，
   * 若不补偿，玩家会觉得"怎么拖都抬不起枪口"。
   */
  syncTouchSens() {
    const h = window.innerHeight || 800;
    // 以 720px 高度为基准；竖屏(>1.15 比例)额外放大 25%
    const ratio = h > window.innerWidth * 1.15 ? 1.25 : 1.0;
    const k = Math.max(0.62, Math.min(1.9, 720 / h)) * ratio;
    this._touchBase = 0.0052 * k;
  }
  consumeFlag(name) {
    if (this[name]) { this[name] = false; return true; }
    return false;
  }
  axis() {
    let x = 0, y = 0;
    if (this.keys.has('KeyW')) y += 1;
    if (this.keys.has('KeyS')) y -= 1;
    if (this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('KeyD')) x += 1;
    if (Math.abs(this.moveX) > 0.12 || Math.abs(this.moveY) > 0.12) {
      x = this.moveX; y = -this.moveY;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
    }
    return { x, y };
  }
  get sprinting() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
}
