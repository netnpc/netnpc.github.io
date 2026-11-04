// Input: keyboard / mouse (Pointer Lock) / touch (virtual stick + drag-look + fire)
export class Input {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    // Look motion is queued and released at the finger's own rate (see consumeLook)
    this._lookSpan = 0;        // seconds of finger motion waiting in the queue
    this._lookTPrev = 0;       // timestamp of the previous sample
    this.firing = false;
    this.moveX = 0;      // -1..1, stick axis
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

    // Touch state
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
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || !this.isDesktopPointer) return;
      if (e.button === 0) this.firing = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.firing = false;
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
    // Touch sensitivity factor, tuned to screen size by syncTouchSens()
    this._touchBase = 0.0052;
    // Always-visible stick hint
    if (this.stickBase) this.stickBase.classList.add('idle');

    // ---- Stick (bottom-left zone only, driven by Touch events) ----
    stickZone.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      // A press on the fire button is left to the fire button; it must not also start the stick
      if (this.btnFire && this.btnFire.contains(e.target)) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (this.stickId !== null) return;
      this.stickId = t.identifier;
      this.stickCX = t.clientX; this.stickCY = t.clientY;
      // The radius follows the rendered size, so on landscape or small screens the stick still moves
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

    // ---- Look drag (Pointer Events: the best support, iOS13+ and all Android) ----
    if (window.PointerEvent) {
      this._bindLookPointer();
    } else {
      this._bindLookTouch();
    }

    // Stick move/end are tracked globally too (the finger can slide out of the stick zone)
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
            // Back to the default position (CSS defines left/bottom; clearing the inline values is enough)
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

    // Fire button
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

  /** Look drag: Pointer Events implementation */
  _bindLookPointer() {
    this.lookPtr = null;
    this.lookPX = 0; this.lookPY = 0;
    // All pointers currently down, used to tell whether lookPtr has gone stale
    this._ptrAlive = new Set();
    document.addEventListener('pointerdown', (e) => this._ptrAlive.add(e.pointerId), true);
    const forget = (e) => this._ptrAlive.delete(e.pointerId);
    document.addEventListener('pointerup', forget, true);
    document.addEventListener('pointercancel', forget, true);

    document.addEventListener('pointerdown', (e) => {
      if (!this.enabled || e.pointerType !== 'touch') return;
      // The stick finger and button fingers are not look input
      const zone = document.getElementById('stickZone');
      if (zone && zone.contains(e.target)) return;
      if (this._isUI(e.clientX, e.clientY)) return;
      // Take over if the previous pointer is stale (its up event was lost), otherwise look stays dead from then on
      if (this.lookPtr !== null && this.lookPtr !== e.pointerId) {
        const stale = this._ptrAlive && this._ptrAlive.has(this.lookPtr);
        if (stale) return;   // another finger really is still down, so do not take over
      }
      this.lookPtr = e.pointerId;
      this.lookPX = e.clientX; this.lookPY = e.clientY;
    }, { passive: true });

    document.addEventListener('pointermove', (e) => {
      if (!this.enabled || e.pointerId !== this.lookPtr) return;

      // The browser may pack several physical samples into one pointermove. Reading only
      // e.clientX keeps the last one and discards the motion in between, so a steady finger
      // arrives as an uneven stitch of jumps and the view stutters. Sum every sample instead.
      // Fall back to the event itself when coalescing is unavailable (older Safari).
      const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
      if (list && list.length) {
        for (const c of list) {
          this._accumLook(c.clientX - this.lookPX, c.clientY - this.lookPY);
          this.lookPX = c.clientX; this.lookPY = c.clientY;
        }
      } else {
        this._accumLook(e.clientX - this.lookPX, e.clientY - this.lookPY);
        this.lookPX = e.clientX; this.lookPY = e.clientY;
      }
    }, { passive: true });

    const up = (e) => { if (e.pointerId === this.lookPtr) this._flushLook(); };
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    // Release when the page goes to the background
    window.addEventListener('blur', () => this._flushLook());
  }

  /** Look drag: Touch event fallback when PointerEvent is unavailable */
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
   * Single entry point for look delta: clamp plus sensitivity.
   * The per-frame clamp is relaxed to 240px: it only catches bad events (finger teleport, coordinate jump),
   * so a normal fast swipe (especially during frame drops) is no longer truncated and the view does not stall mid-drag.
   *
   * Motion is queued rather than applied at once. Touch samples arrive on their own clock
   * (120-240Hz) while frames run at 60Hz, so a frame can receive 3, 4 or 5 samples at random
   * and the view advances by a lumpy 3.8 / 5.0 / 6.3 degrees instead of a steady 5.0. That
   * fluctuation is visible as stutter, even though the finger never changed speed.
   * Queueing lets consumeLook() hand the motion out at the rate the finger is actually moving.
   */
  _accumLook(dx, dy) {
    const cap = 240;
    const cd = Math.max(-cap, Math.min(cap, dx));
    const cdy = Math.max(-cap, Math.min(cap, dy));
    const s = this._touchBase * this.sens;
    const now = performance.now();
    // How much time this batch of motion represents: the gap since the previous sample.
    // Bounded on both sides. The lower bound is a quarter frame: a pointer can never report
    // faster than 240Hz, and without it a burst of samples delivered in the same millisecond
    // would claim almost no elapsed time, so the queue would look shorter than one frame and
    // consumeLook() would dump the entire batch in a single frame. The upper bound stops a
    // backgrounded tab or a finger that stopped and resumed from injecting a huge backlog.
    const MIN_GAP = 0.004, MAX_GAP = 0.05;
    const gap = this._lookTPrev
      ? Math.min(MAX_GAP, Math.max(MIN_GAP, (now - this._lookTPrev) / 1000))
      : MIN_GAP;
    this._lookTPrev = now;
    this.lookDX += cd * s;
    this.lookDY += cdy * s;
    this._lookSpan += gap;          // seconds of finger motion currently queued
  }

  /** When touchmove is lost (finger flung off screen), a synthetic event fills in the last stretch of movement */
  _flushLook() {
    this.lookPtr = null;
    this._touchLookId = null;
    this._lookTPrev = 0;
    // Any motion still queued at this point is at most a frame's worth and is released on the
    // next frame: dropping it here would clip the end of every drag. The queue is capped by
    // the per-sample gap clamp, so it cannot grow into a jump even if this never runs.
  }

  // Whether a screen point hits an interactive button (touches there do not turn the view)
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

  /**
   * Hand out this frame's share of the queued motion.
   *
   * The queue holds motion the finger has already produced, tagged with how long the finger
   * spent producing it (`_lookSpan`). Each frame releases a slice proportional to the frame
   * time, so the view turns at the finger's true speed instead of in event-sized lumps.
   * A small amount is deliberately left in the queue: if the frame time and the sample clock
   * drift apart, an empty queue would drop the last sample and cause a visible catch-up.
   */
  consumeLook(dt) {
    const frame = dt || 1 / 60;
    // Cap the backlog at a few frames. If the page was throttled or the finger stopped for a
    // moment, a long queue would otherwise be dumped as one violent swipe when it resumes.
    const MAX_SPAN = frame * 3;
    if (this._lookSpan > MAX_SPAN) {
      const keep = MAX_SPAN / this._lookSpan;
      this.lookDX *= keep; this.lookDY *= keep;
      this._lookSpan = MAX_SPAN;
    }
    let f = 1;
    if (this._lookSpan > 1e-6) {
      // Release one frame's worth, but never more than what is queued
      f = Math.min(1, frame / this._lookSpan);
    }
    const dx = this.lookDX * f;
    const dy = this.lookDY * f;
    this.lookDX -= dx;
    this.lookDY -= dy;
    this._lookSpan = Math.max(0, this._lookSpan - frame);

    // Below a pixel the leftover is not worth keeping; flush it so the view cannot creep
    if (Math.abs(this.lookDX) < 1e-5 && Math.abs(this.lookDY) < 1e-5) {
      this.lookDX = 0; this.lookDY = 0; this._lookSpan = 0;
    }

    // Lets aim assist tell whether the player is actively turning right now:
    // The harder the turn, the weaker the pull, so assist never fights the player.
    this.lastLookDX = dx;
    this.lastLookDY = dy;
    return { dx, dy };
  }

  /**
   * Touch look sensitivity, calibrated to screen width.
   * Turning is a horizontal gesture, so the narrower the screen the more a given finger travel must turn,
   * otherwise in portrait the view never comes round.
   * Target: about 0.34 screen widths of drag is a 180 degree turn, so one thumb swipe turns the player around.
   */
  syncTouchSens() {
    const w = window.innerWidth || 400;
    // 0.42 screen widths maps to pi radians, so base = pi / (0.42 * w)
    // A little steadier than the old 0.34: at 844px landscape a 180 degree turn takes about 354px of drag
    const base = Math.PI / (0.42 * w);
    this._touchBase = Math.max(0.0040, Math.min(0.024, base));
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
