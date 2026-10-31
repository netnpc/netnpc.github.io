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
    // 触屏灵敏度系数：由 syncTouchSens() 按屏幕尺寸调整
    this._touchBase = 0.0052;
    // 常显摇杆提示
    if (this.stickBase) this.stickBase.classList.add('idle');

    // ---- 摇杆（仅左下触发区，用 Touch 事件） ----
    stickZone.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      // 点在开火键上时交给开火键自己处理，不要顺带触发摇杆
      if (this.btnFire && this.btnFire.contains(e.target)) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (this.stickId !== null) return;
      this.stickId = t.identifier;
      this.stickCX = t.clientX; this.stickCY = t.clientY;
      // 半径跟随实际渲染尺寸，横屏/小屏下不会"推不动"
      const br = this.stickBase ? this.stickBase.offsetWidth / 2 : 59;
      this.stickBaseR = br || 59;
      if (this.stickBase) {
        this.stickBase.classList.remove('idle');
        this.stickBase.style.left = t.clientX + 'px';
        this.stickBase.style.top = t.clientY + 'px';
        this.stickBase.style.bottom = 'auto';
        this.stickBase.style.margin = (-this.stickBaseR) + 'px 0 0 ' + (-this.stickBaseR) + 'px';
        this.stickBase.classList.add('active');
      }
      this.updateStick(t.clientX, t.clientY);
    }, { passive: false });

    // ---- 视角滑动（Pointer Events：兼容性最好，iOS13+/Android 全支持） ----
    if (window.PointerEvent) {
      this._bindLookPointer();
    } else {
      this._bindLookTouch();
    }

    // 摇杆的 move/end 也要在全局跟踪（手指可能滑出摇杆区）
    const stickMove = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          e.preventDefault();
          this.updateStick(t.clientX, t.clientY);
        }
      }
    };
    const stickEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          this.stickId = null;
          this.moveX = 0; this.moveY = 0;
          if (this.stickBase) {
            this.stickBase.classList.remove('active');
            this.stickBase.classList.add('idle');
            // 回到默认位置（默认 left/bottom 由 CSS 定义，这里清掉内联值即可）
            this.stickBase.style.left = '';
            this.stickBase.style.top = '';
            this.stickBase.style.bottom = '';
            this.stickBase.style.margin = '';
          }
          if (this.stickKnob) this.stickKnob.style.transform = 'translate(0,0)';
        }
      }
    };
    document.addEventListener('touchmove', stickMove, { passive: false });
    document.addEventListener('touchend', stickEnd);
    document.addEventListener('touchcancel', stickEnd);

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

  /** 视角拖拽：Pointer Events 实现 */
  _bindLookPointer() {
    this.lookPtr = null;
    this.lookPX = 0; this.lookPY = 0;
    // 当前按在屏幕上的所有指针，用于判断 lookPtr 是否已失效
    this._ptrAlive = new Set();
    document.addEventListener('pointerdown', (e) => this._ptrAlive.add(e.pointerId), true);
    const forget = (e) => this._ptrAlive.delete(e.pointerId);
    document.addEventListener('pointerup', forget, true);
    document.addEventListener('pointercancel', forget, true);

    document.addEventListener('pointerdown', (e) => {
      if (!this.enabled || e.pointerType !== 'touch') return;
      // 摇杆手指与按钮手指不作为视角
      const zone = document.getElementById('stickZone');
      if (zone && zone.contains(e.target)) return;
      if (this._isUI(e.clientX, e.clientY)) return;
      // 旧指针若已失效（up 事件丢失）就抢占，否则会出现"此后怎么滑都没反应"
      if (this.lookPtr !== null && this.lookPtr !== e.pointerId) {
        const stale = this._ptrAlive && this._ptrAlive.has(this.lookPtr);
        if (stale) return;   // 另一根手指确实还在按着，这次不接管
      }
      this.lookPtr = e.pointerId;
      this.lookPX = e.clientX; this.lookPY = e.clientY;
    }, { passive: true });

    document.addEventListener('pointermove', (e) => {
      if (!this.enabled || e.pointerId !== this.lookPtr) return;
      const dx = e.clientX - this.lookPX;
      const dy = e.clientY - this.lookPY;
      this.lookPX = e.clientX; this.lookPY = e.clientY;
      this._accumLook(dx, dy);
    }, { passive: true });

    const up = (e) => { if (e.pointerId === this.lookPtr) this._flushLook(); };
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    // 页面切后台时释放
    window.addEventListener('blur', () => this._flushLook());
  }

  /** 视角拖拽：无 PointerEvent 时的 Touch 事件兜底 */
  _bindLookTouch() {
    this._touchLookId = null;
    document.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      const zone = document.getElementById('stickZone');
      for (const t of e.changedTouches) {
        if (zone && zone.contains(t.target)) continue;
        if (this._isUI(t.clientX, t.clientY)) continue;
        if (this._touchLookId === null) {
          this._touchLookId = t.identifier;
          this.lookLX = t.clientX; this.lookLY = t.clientY;
        }
      }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this._touchLookId) {
          e.preventDefault();
          const dx = t.clientX - this.lookLX;
          const dy = t.clientY - this.lookLY;
          this.lookLX = t.clientX; this.lookLY = t.clientY;
          this._accumLook(dx, dy);
        }
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._touchLookId) this._touchLookId = null;
      }
    };
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
  }

  /**
   * 视角增量统一入口：钳制 + 灵敏度。
   * 单帧增量上限放宽到 240px：只在事件异常（手指瞬移/坐标跳变）时兜底，
   * 正常的快速滑动（尤其掉帧时）不会再被截断，避免"划到一半卡住"。
   */
  _accumLook(dx, dy) {
    const cap = 240;
    const cd = Math.max(-cap, Math.min(cap, dx));
    const cdy = Math.max(-cap, Math.min(cap, dy));
    const s = this._touchBase * this.sens;
    this.lookDX += cd * s;
    this.lookDY += cdy * s;
  }

  /** 丢失 touchmove 时（如手指很快甩出屏幕）用合成事件补齐最后一段位移 */
  _flushLook() {
    this.lookPtr = null;
    this._touchLookId = null;
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
   * 触屏视角灵敏度：按屏幕宽度标定。
   * 左右转视角是横向手势，屏幕越窄，同样的手指位移就该转得越多，
   * 否则竖屏下会出现"怎么划都转不过来"。
   * 目标：拖动约 0.34 个屏宽 ≈ 转身 180°，单手拇指一划即可转身。
   */
  syncTouchSens() {
    const w = window.innerWidth || 400;
    // 0.34 屏宽对应 π 弧度 → base = π / (0.34 * w)
    // 横屏 844px：转 180° 约拖 287px；竖屏 390px：约拖 133px
    const base = Math.PI / (0.34 * w);
    this._touchBase = Math.max(0.0048, Math.min(0.030, base));
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
