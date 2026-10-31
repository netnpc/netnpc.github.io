// HUD 界面控制
export class HUD {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      cross: document.getElementById('crosshair'),
      hitmark: document.getElementById('hitmark'),
      hpfill: document.getElementById('hpfill'),
      hpnum: document.getElementById('hpnum'),
      armornum: document.getElementById('armornum'),
      mag: document.getElementById('mag'),
      reserve: document.getElementById('reserve'),
      wname: document.getElementById('weaponName'),
      reloadHint: document.getElementById('reloadHint'),
      timer: document.getElementById('timer'),
      scoreCT: document.getElementById('scoreCT'),
      scoreT: document.getElementById('scoreT'),
      killfeed: document.getElementById('killfeed'),
      alert: document.getElementById('alert'),
      vign: document.getElementById('damageVignette'),
      roundinfo: document.getElementById('roundinfo'),
      radar: document.getElementById('radar'),
    };
    this.rctx = this.el.radar.getContext('2d');
    this._alertT = 0;
    this._hurtT = 0;
  }

  show(v) { this.el.hud.classList.toggle('hidden', !v); }

  updateAmmo(player) {
    const a = player.ammo[player.weapon];
    this.el.mag.textContent = a.mag;
    this.el.reserve.textContent = a.reserve;
    this.el.wname.textContent = player.def.name;
    const low = a.mag <= Math.ceil(player.def.magSize * 0.2);
    this.el.mag.style.color = low ? '#ff5252' : '#fff';
    if (a.mag === 0 && a.reserve > 0) {
      this.el.reloadHint.classList.remove('hidden');
      this.el.reloadHint.textContent = 'PRESS R TO RELOAD';
      this.el.reloadHint.classList.add('blink');
    } else if (!player.reloading) {
      this.el.reloadHint.classList.add('hidden');
    }
  }

  setReloading(on, total = 2) {
    const h = this.el.reloadHint;
    if (on) {
      h.classList.remove('hidden', 'blink');
      h.textContent = 'RELOADING…';
    } else {
      h.classList.add('hidden');
      h.textContent = 'PRESS R TO RELOAD';
    }
  }

  flashReloadHint() {
    const h = this.el.reloadHint;
    h.classList.remove('hidden');
    h.textContent = 'PRESS R TO RELOAD';
    h.classList.add('blink');
  }

  updateVitals(player) {
    this.el.hpfill.style.width = Math.max(0, player.hp) + '%';
    this.el.hpnum.textContent = Math.ceil(player.hp);
    this.el.armornum.textContent = Math.ceil(player.armor);
    this.el.hpnum.style.color = player.hp <= 30 ? '#ff5252' : '#fff';
  }

  updateTimer(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    this.el.timer.textContent = `${m}:${String(r).padStart(2, '0')}`;
    this.el.timer.classList.toggle('low', s <= 20);
  }

  updateScore(ct, t) {
    this.el.scoreCT.textContent = ct;
    this.el.scoreT.textContent = t;
  }

  hit(head) {
    const h = this.el.hitmark;
    h.classList.remove('on');
    h.classList.toggle('head', !!head);
    void h.offsetWidth;
    h.classList.add('on');
  }

  killFeed(name, head) {
    const d = document.createElement('div');
    d.className = 'kf' + (head ? ' head' : '');
    d.innerHTML = `<span class="k">YOU</span><span class="s">${head ? '⌖ HEADSHOT' : '✕'} ${name}</span>`;
    this.el.killfeed.appendChild(d);
    setTimeout(() => d.remove(), 4200);
    while (this.el.killfeed.children.length > 4) this.el.killfeed.firstChild.remove();
  }

  /**
   * 中央大字提示。
   * 传 "主标题|副标题" 会显示成两行，副标题略小。
   * 渲染后实测文字宽度，超出安全宽度时自动缩字号，保证任何屏幕完整可见。
   */
  alert(text, dur = 1.6) {
    const a = this.el.alert;
    a.innerHTML = '';
    a.style.fontSize = '';
    const bar = String(text).indexOf('|');
    if (bar >= 0) {
      const main = String(text).slice(0, bar).trim();
      const sub = String(text).slice(bar + 1).trim();
      const m = document.createElement('span');
      m.className = 'al-main';
      m.textContent = main;
      a.appendChild(m);
      if (sub) {
        const s = document.createElement('span');
        s.className = 'al-sub';
        s.textContent = sub;
        a.appendChild(s);
      }
    } else {
      // 纯文本也包一层，与两行版共用同一套测宽逻辑
      const m = document.createElement('span');
      m.className = 'al-main';
      m.textContent = text;
      a.appendChild(m);
    }
    a.classList.add('show');
    this._alertT = dur;
    this._fitAlert();
  }

  /** 按容器实际宽度收缩字号，最多缩到基准的 45%；仍放不下则允许折行 */
  _fitAlert() {
    const a = this.el.alert;
    const boxW = a.clientWidth;
    if (!boxW) return;
    const base = parseFloat(getComputedStyle(a).fontSize) || 20;
    const kids = Array.from(a.children);
    // 主标题 nowrap，用 Range 量真实文字宽度（不取 offsetWidth，那是块宽）
    const textW = () => {
      if (!kids.length) return a.scrollWidth;
      return Math.max(...kids.map((k) => {
        const rg = document.createRange();
        rg.selectNodeContents(k);
        return rg.getBoundingClientRect().width;
      }));
    };
    let fs = base;
    a.style.fontSize = fs + 'px';
    let guard = 0;
    while (guard++ < 22) {
      if (textW() <= boxW - 2) break;
      if (fs <= base * 0.45) {
        // 到下限仍溢出：放开换行，宁可折行也不出屏
        kids.forEach((k) => { k.style.whiteSpace = 'normal'; });
        break;
      }
      fs = Math.max(base * 0.45, fs * 0.94);
      a.style.fontSize = fs.toFixed(2) + 'px';
    }
  }

  roundInfo(text) { this.el.roundinfo.textContent = text || ''; }

  hurt() {
    this.el.vign.classList.add('hurt');
    this._hurtT = 0.22;
  }

  setCrossSpread(spread) {
    const px = Math.min(26, 4 + spread * 480);
    const s = 18 + px;
    this.el.cross.style.width = s + 'px';
    this.el.cross.style.height = s + 'px';
  }

  setCrossEnemy(on) { this.el.cross.classList.toggle('enemy', on); }

  tick(dt) {
    if (this._alertT > 0) {
      this._alertT -= dt;
      if (this._alertT <= 0) this.el.alert.classList.remove('show');
    }
    if (this._hurtT > 0) {
      this._hurtT -= dt;
      if (this._hurtT <= 0) this.el.vign.classList.remove('hurt');
    }
  }

  drawRadar(player, enemies, world) {
    const ctx = this.rctx;
    const W = this.el.radar.width, cx = W / 2, cy = W / 2;
    const scale = W / 64;
    const rot = player.yaw;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    ctx.clearRect(0, 0, W, W);

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, cx - 2, 0, 7); ctx.clip();
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, cx);
    g.addColorStop(0, 'rgba(24,56,46,.5)');
    g.addColorStop(1, 'rgba(6,12,16,.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, W);

    // 障碍
    ctx.fillStyle = 'rgba(150,185,205,.16)';
    for (const b of world.colliders) {
      const bx = (b.minX + b.maxX) / 2 - player.pos.x;
      const bz = (b.minZ + b.maxZ) / 2 - player.pos.z;
      const bw = b.maxX - b.minX, bd = b.maxZ - b.minZ;
      const rx = bx * cos - bz * sin;
      const rz = bx * sin + bz * cos;
      ctx.save();
      ctx.translate(cx + rx * scale, cy + rz * scale);
      ctx.rotate(rot);
      ctx.fillRect(-bw * scale / 2, -bd * scale / 2, bw * scale, bd * scale);
      ctx.restore();
    }

    // 敌人
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.pos.x - player.pos.x;
      const dz = e.pos.z - player.pos.z;
      const dist = Math.hypot(dx, dz);
      if (!e.seesPlayer && dist > 15) continue;
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      const px = cx + rx * scale, pz = cy + rz * scale;
      if (Math.hypot(px - cx, pz - cy) > cx - 6) continue;
      ctx.fillStyle = e.seesPlayer ? '#ff4d4d' : 'rgba(255,140,100,.55)';
      ctx.beginPath(); ctx.arc(px, pz, e.seesPlayer ? 5 : 3.5, 0, 7); ctx.fill();
      if (e.seesPlayer) {
        ctx.strokeStyle = 'rgba(255,80,80,.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, pz, 8.5, 0, 7); ctx.stroke();
      }
    }

    // 玩家箭头
    ctx.fillStyle = '#37e0a0';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 6.5, cy + 7); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 6.5, cy + 7);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(55,224,160,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, cx - 2.5, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(55,224,160,.09)';
    ctx.beginPath(); ctx.moveTo(cx, 3); ctx.lineTo(cx, W - 3); ctx.moveTo(3, cy); ctx.lineTo(W - 3, cy); ctx.stroke();
  }
}
