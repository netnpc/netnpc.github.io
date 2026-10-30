// 主游戏：渲染、射击、回合管理、UI 绑定
import * as THREE from '../vendor/three.module.min.js?v=20261030215429';
import { World, ARENA, MAPS, getMap } from './world.js?v=20261030215429';
import { Player, Enemy, WEAPONS } from './game.js?v=20261030215429';
import { HUD } from './ui.js?v=20261030215429';
import { Input } from './input.js?v=20261030215429';
import { Sfx } from './audio.js?v=20261030215429';
import { buildRifle, buildPistol, flashTexture } from './assets.js?v=20261030215429';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ENEMY_NAMES = ['Ghost', 'Anvil', 'Viper', 'Fang', 'Nightowl', 'Vulture', 'Blade', 'Sandstorm', 'Thunder', 'Cutthroat', 'Falcon', 'Tiger'];

class Game {
  constructor() {
    this.settings = {
      sens: parseFloat(localStorage.getItem('zs_sens') || '1'),
      fov: parseInt(localStorage.getItem('zs_fov') || '85'),
      quality: localStorage.getItem('zs_quality') || 'low',
      sound: localStorage.getItem('zs_sound') !== '0',
      map: localStorage.getItem('zs_map') || 'depot',
    };
    this.state = 'menu'; // menu | playing | paused | end
    this.clock = new THREE.Clock();
    this.sfx = new Sfx();
    this.sfx.enabled = this.settings.sound;
    this.tracers = [];
    this.impacts = [];
    this.enemies = [];
    this.shakeAmt = 0;
    this.timeLeft = 120;
    this.round = 0;
    this.waveQueue = [];
    this.spawnTimer = 0;
    this.scoreCT = 0;
    this.scoreT = 0;
    this.totalEnemies = 0;
    this.best = JSON.parse(localStorage.getItem('zs_best') || '{"kills":0,"score":0,"wins":0}');
    this.ads = false;
    this.adsK = 0;
    this.canvas = $('scene');
    this.initRenderer();
    this.initScene();
    this.initWeaponView();
    this.hud = new HUD();
    this.player = new Player(this);
    this.input = new Input(this.canvas, { onPause: () => this.pause() });
    this.input.sens = this.settings.sens;
    this.input.syncTouchSens();
    this.bindUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
    this.setupTouchMode();
    this.showMenuStats();
    $('loading').classList.add('hidden');
    this.animate();
  }

  initRenderer() {
    const hi = this.settings.quality === 'high';
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: hi, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 2 : 1.5));
    this.renderer.shadowMap.enabled = hi;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, 1, 0.05, 200);
    this.camera.rotation.order = 'YXZ';
  }

  initScene() {
    const hi = this.settings.quality === 'high';
    // 光照
    const hemi = new THREE.HemisphereLight(0xe8f2ff, 0x8a8070, 2.9);
    this.scene.add(hemi);
    this.hemi = hemi;
    const sun = new THREE.DirectionalLight(0xfff4e2, 3.4);
    sun.position.set(28, 42, 18);
    if (hi) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const d = 34;
      sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
      sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
      sun.shadow.camera.far = 120;
      sun.shadow.bias = -0.0006;
    }
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb8d4ff, 1.3);
    fill.position.set(-25, 18, -20);
    const bounce = new THREE.DirectionalLight(0xffe0b0, 0.7);
    bounce.position.set(10, -8, -10);
    this.scene.add(fill, bounce);
    this.sun = sun; this.fill = fill; this.bounce = bounce;

    this.world = new World(this.scene, this.settings.quality, this.settings.map);

    // 枪口闪光贴图
    this.flashTex = flashTexture();
  }

  /** 切换地图：销毁旧场景对象、重建世界并重置玩家 */
  loadMap(id) {
    if (this.world) this.world.dispose();
    this.settings.map = id;
    localStorage.setItem('zs_map', id);
    this.world = new World(this.scene, this.settings.quality, id);
    // 地块色调差异：轻微调整补光
    const m = getMap(id);
    const warm = id === 'harbor';
    this.sun.color.setHex(warm ? 0xffe0bc : 0xfff4e2);
    this.sun.intensity = warm ? 2.9 : 3.4;
    this.hemi.intensity = warm ? 2.6 : 2.9;
    this.fill.intensity = warm ? 1.6 : 1.3;
    // 清理敌人与特效
    this.enemies.forEach((e) => e.dispose());
    this.enemies = [];
    this.tracers.forEach((t) => { this.scene.remove(t.line); t.line.geometry.dispose(); });
    this.tracers = [];
    this.impacts.forEach((i) => this.scene.remove(i.mesh));
    this.impacts = [];
    // 菜单相机对准地图中心
    this.camera.far = 200;
    this.camera.updateProjectionMatrix();
    const mn = $('mapName');
    if (mn) mn.textContent = m.name;
  }

  initWeaponView() {
    // 第一人称武器单独场景，避免穿墙
    this.wScene = new THREE.Scene();
    this.wCam = new THREE.PerspectiveCamera(55, 1, 0.01, 10);
    this.wScene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const d1 = new THREE.DirectionalLight(0xfff0dd, 2.2); d1.position.set(0.6, 1, 1.2); this.wScene.add(d1);
    const d2 = new THREE.DirectionalLight(0x88b4ff, 0.9); d2.position.set(-1, 0.4, -0.8); this.wScene.add(d2);

    this.rifle = buildRifle();
    this.pistol = buildPistol();
    this.rifleRoot = new THREE.Group();
    this.pistolRoot = new THREE.Group();
    this.rifleRoot.add(this.rifle);
    this.pistolRoot.add(this.pistol);
    this.rifleRoot.position.set(0.235, -0.235, -0.36);
    this.pistolRoot.position.set(0.21, -0.21, -0.32);
    this.rifleRoot.rotation.set(0.02, 0.05, 0.02);
    this.pistolRoot.rotation.set(0.02, 0.05, 0.02);
    this.pistolRoot.visible = false;
    this.wScene.add(this.rifleRoot, this.pistolRoot);

    // 枪口火光
    const fMat = new THREE.SpriteMaterial({
      map: this.flashTex, color: 0xffddaa, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    });
    this.flash = new THREE.Sprite(fMat);
    this.flash.scale.set(0.5, 0.5, 1);
    this.flash.position.set(0, 0.035, -0.66);
    this.flash.visible = false;
    this.rifle.add(this.flash);
    this.flash2 = new THREE.Sprite(fMat.clone());
    this.flash2.scale.set(0.35, 0.35, 1);
    this.flash2.position.set(0, 0.015, -0.22);
    this.flash2.visible = false;
    this.pistol.add(this.flash2);

    // 后坐/摆动状态
    this.recoil = 0;
    this.sway = { x: 0, y: 0 };
    this.flashT = 0;
    this.switchT = 0;
  }

  // ---------------- UI 绑定 ----------------
  bindUI() {
    this.buildMapPicker();
    $('btnStart').onclick = () => this.startGame();
    $('btnHowto').onclick = () => $('help').classList.remove('hidden');
    $('btnHelpClose').onclick = () => $('help').classList.add('hidden');
    $('btnSettings').onclick = () => {
      $('setSens').value = this.settings.sens * 100;
      $('setSensVal').textContent = this.settings.sens.toFixed(2);
      $('setFov').value = this.settings.fov;
      $('setFovVal').textContent = this.settings.fov;
      $('setQuality').value = this.settings.quality;
      $('settings').classList.remove('hidden');
    };
    $('setSens').oninput = (e) => {
      this.settings.sens = e.target.value / 100;
      this.input.sens = this.settings.sens;
      $('setSensVal').textContent = this.settings.sens.toFixed(2);
    };
    $('setFov').oninput = (e) => {
      this.settings.fov = +e.target.value;
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
      $('setFovVal').textContent = this.settings.fov;
    };
    $('btnSetClose').onclick = () => {
      this.settings.quality = $('setQuality').value;
      localStorage.setItem('zs_sens', this.settings.sens);
      localStorage.setItem('zs_fov', this.settings.fov);
      localStorage.setItem('zs_quality', this.settings.quality);
      $('settings').classList.add('hidden');
      if (this.settings.quality !== (this.world.quality)) {
        this.hud.alert('Graphics change applies after reload', 2.2);
      }
    };
    $('btnPause').onclick = () => this.pause();
    $('btnSound').onclick = () => {
      this.settings.sound = !this.settings.sound;
      this.sfx.enabled = this.settings.sound;
      localStorage.setItem('zs_sound', this.settings.sound ? '1' : '0');
      $('btnSound').textContent = this.settings.sound ? '🔊' : '🔇';
    };
    $('btnSound').textContent = this.settings.sound ? '🔊' : '🔇';
    $('btnResume').onclick = () => this.resume();
    $('btnRestart').onclick = () => { $('pause').classList.add('hidden'); this.startGame(); };
    $('btnQuit').onclick = () => { $('pause').classList.add('hidden'); this.quitToMenu(); };
    $('btnAgain').onclick = () => { $('end').classList.add('hidden'); this.startGame(); };
    $('btnBackMenu').onclick = () => { $('end').classList.add('hidden'); this.quitToMenu(); };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
      }
      if (e.code === 'Space' && this.state === 'playing' && !this.input.isTouch) {
        // 空格在菜单/结束不要滚动
      }
    });

    // 点击画布恢复 pointer lock
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.input.locked && !this.input.isTouch) this.input.requestLock();
    });
  }

  setupTouchMode() {
    const touch = this.input.isTouch || (window.matchMedia('(pointer:coarse)').matches && navigator.maxTouchPoints > 0);
    document.body.classList.toggle('touchmode', touch);
    $('touch').classList.toggle('hidden', !touch);
  }

  /** 构建地图选择卡片 */
  buildMapPicker() {
    const list = $('mapList');
    if (!list) return;
    const swatchColors = {
      depot: 'linear-gradient(150deg,#5d7f96,#8a7a58)',
      harbor: 'linear-gradient(150deg,#7f5a44,#3d5a68)',
      foundry: 'linear-gradient(150deg,#8a6a4a,#4a4e56)',
    };
    list.innerHTML = '';
    for (const m of MAPS) {
      const b = document.createElement('button');
      b.className = 'mapCard' + (m.id === this.settings.map ? ' on' : '');
      b.dataset.map = m.id;
      b.innerHTML = `<span class="swatch" style="background:${swatchColors[m.id] || '#666'}"><i></i><i></i><i></i></span>
        <span class="mtext"><span class="mname">${m.name}</span><span class="mdesc">${m.desc}</span></span>
        <span class="mtick">✓</span>`;
      b.onclick = () => this.pickMap(m.id);
      list.appendChild(b);
    }
    const cur = getMap(this.settings.map);
    const mn = $('mapName');
    if (mn) mn.textContent = cur.name;
  }

  /** 菜单里切换地图：即时重建世界，让背景预览也能看到新图 */
  pickMap(id) {
    if (id === this.settings.map && this.world && this.world.mapId === id) {
      // 已经在这张图，仅刷新选中态
      this.refreshMapCards(id);
      return;
    }
    this.refreshMapCards(id);
    this.loadMap(id);
    // 菜单相机复位
    this._menuT = 0;
    this.showMenuStats();
  }

  refreshMapCards(id) {
    const list = $('mapList');
    if (!list) return;
    for (const el of list.children) {
      el.classList.toggle('on', el.dataset.map === id);
    }
  }

  showMenuStats() {
    $('bestKills').textContent = this.best.kills;
    $('bestScore').textContent = this.best.score;
    $('bestWins').textContent = this.best.wins;
  }

  // ---------------- 流程 ----------------
  startGame() {
    this.sfx.init();
    $('menu').classList.add('hidden');
    $('end').classList.add('hidden');
    $('pause').classList.add('hidden');
    $('help').classList.add('hidden');
    // 清理敌人
    this.enemies.forEach((e) => e.dispose());
    this.enemies = [];
    this.tracers.forEach((t) => { this.scene.remove(t.line); t.line.geometry.dispose(); });
    this.tracers = [];
    this.impacts.forEach((i) => this.scene.remove(i.mesh));
    this.impacts = [];

    this.player.reset();
    this.hud.show(true);
    this.hud.updateVitals(this.player);
    this.hud.updateAmmo(this.player);
    this.hud.roundInfo('');
    this.scoreCT = 0;
    this.scoreT = 0;
    this.totalEnemies = 0;
    this.timeLeft = 120;
    this.round = 0;
    this.waveActive = false;
    this._nextWaveT = 0;
    this.waveQueue = [];
    this.hud.updateScore(0, 0);
    this.hud.updateTimer(this.timeLeft);
    this.state = 'playing';
    this.input.enabled = true;
    this.input.firing = false;
    this.input.exitLock();

    // 准星/视角
    this.player.yaw = this.world.spawnYaw || 0;
    this.player.pitch = -0.02;

    this.startWave(1);
    if (!this.input.isTouch) {
      setTimeout(() => { if (this.state === 'playing') this.input.requestLock(); }, 120);
    }
    $('hint').style.opacity = '1';
    setTimeout(() => { $('hint').style.opacity = '0'; }, 7000);
  }

  startWave(n) {
    this.round = n;
    this.sfx.waveStart();
    const config = [
      { count: 4, tiers: [0, 0, 1, 0] },
      { count: 5, tiers: [0, 1, 1, 1, 0] },
      { count: 5, tiers: [1, 1, 2, 1, 2] },
    ];
    const cfg = config[Math.min(n - 1, config.length - 1)];
    this.waveQueue = [...cfg.tiers];
    this.totalEnemies += cfg.count;
    this.waveActive = true;
    this.spawnTimer = 0.5;
    this.hud.alert(n === 1 ? 'WAVE 1 · HOSTILES INBOUND' : `WAVE ${n} · ${cfg.count} HOSTILES`, 2.0);
    this.hud.roundInfo(`WAVE ${n} / 3 · ${this.waveQueue.length} LEFT`);

    // 每波补充弹药
    if (n > 1) {
      this.player.ammo.rifle.reserve = Math.min(240, this.player.ammo.rifle.reserve + 90);
      this.player.ammo.pistol.reserve = Math.min(120, this.player.ammo.pistol.reserve + 34);
      this.player.armor = Math.min(100, this.player.armor + 25);
      this.player.hp = Math.min(100, this.player.hp + 20);
      this.hud.updateAmmo(this.player);
      this.hud.updateVitals(this.player);
      this.hud.alert('RESUPPLIED · AMMO / ARMOR / HEALTH', 1.8);
    }
  }

  updateWaves(dt) {
    if (this.round <= 0) return;
    if (this.waveQueue.length > 0) {
      this.spawnTimer -= dt;
      const alive = this.enemies.filter((e) => !e.dead).length;
      const maxAlive = 2 + this.round;
      if (this.spawnTimer <= 0 && alive < maxAlive) {
        this.spawnEnemy(this.waveQueue.pop());
        this.spawnTimer = 0.9 + Math.random() * 0.9;
        this.hud.roundInfo(`WAVE ${this.round} / 3 · ${this.waveQueue.length + alive + 1} LEFT`);
      }
    } else if (this.waveActive && !this.enemies.some((e) => !e.dead)) {
      this.waveActive = false;
      if (this.round >= 3) {
        this.endGame(true);
      } else {
        this.hud.alert('WAVE CLEAR · STANDBY FOR NEXT', 1.8);
        this._nextWaveT = 2.6;
      }
    }
    if (this._nextWaveT > 0) {
      this._nextWaveT -= dt;
      if (this._nextWaveT <= 0) {
        this._nextWaveT = 0;
        this.startWave(this.round + 1);
      }
    }
  }

  spawnEnemy(tier) {
    // 按候选点评分：不阻挡玩家射线、不与其他敌人重叠、不过近
    const spawns = this.world.spawns;
    let best = null, bestScore = -1e9;
    const origin = new THREE.Vector3(this.player.pos.x, this.player.eye, this.player.pos.z);
    for (const s of spawns) {
      const d = s.distanceTo(this.player.pos);
      if (d < 11) continue;
      let score = 26 - Math.abs(d - 19) + Math.random() * 5;
      // 视线是否通畅（通畅的点更"公平"）
      const dir = new THREE.Vector3(s.x, 1.4, s.z).sub(origin).normalize();
      const wall = this.world.raycast(origin, dir, s.distanceTo(this.player.pos) - 1);
      if (wall) score -= 3;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (e.pos.distanceTo(s) < 4) score -= 8;
      }
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (!best) best = spawns[Math.floor(Math.random() * spawns.length)];
    const p = best.clone();
    p.x += (Math.random() - 0.5) * 2;
    p.z += (Math.random() - 0.5) * 2;
    const e = new Enemy(this, p, tier);
    e.reactionT = 0.4 + Math.random() * 0.35;
    if (tier === 2) { e.speed = 3.1; }
    else if (tier === 1) { e.speed = 3.2; }
    e.name = tier === 2 ? 'ELITE · ' + pick(ENEMY_NAMES) : pick(ENEMY_NAMES);
    this.enemies.push(e);
    return e;
  }

  onPlayerShot() {
    const p = this.player;
    const def = p.def;
    const origin = new THREE.Vector3(p.pos.x, p.eye, p.pos.z);
    // 视角方向
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ'));

    // 散布
    const moving = Math.hypot(p.vel.x, p.vel.z) > 2.2;
    const airborne = !p.onGround;
    let spread = this.adsK > 0.5 ? def.spreadAds : moving ? def.spreadMoving : def.spread;
    if (airborne) spread *= 1.5;
    if (p.crouch) spread *= 0.7;
    spread *= 1 + (1 - p.ammo[p.weapon].mag / def.magSize) * 0.15; // 连射略微扩散

    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, p.yaw, 0));
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * spread;
    const shotDir = dir.clone()
      .addScaledVector(right, Math.cos(a) * r)
      .addScaledVector(up, Math.sin(a) * r)
      .normalize();

    const muzzleWorld = new THREE.Vector3(p.pos.x, p.eye, p.pos.z).addScaledVector(dir, 0.35);

    let maxD = def.range;
    let endPoint = origin.clone().addScaledVector(shotDir, maxD);
    let bestEnemy = null, bestHit = null;

    // 敌人命中
    for (const e of this.enemies) {
      if (e.dead) continue;
      const hit = e.rayHit(origin, shotDir, maxD);
      if (hit && (!bestHit || hit.dist < bestHit.dist)) { bestHit = hit; bestEnemy = e; }
    }
    // 墙面
    const wall = this.world.raycast(origin, shotDir, maxD);
    if (wall && (!bestHit || wall.dist < bestHit.dist)) {
      endPoint = wall.point;
      this.spawnImpact(wall.point, 0x9a9484, wall.box.maxY > 2.5 ? 0x8a8478 : 0x6f6a5e);
      bestEnemy = null; bestHit = null;
    } else if (bestHit) {
      endPoint = origin.clone().addScaledVector(shotDir, bestHit.dist);
      // 伤害衰减
      const falloff = Math.max(def.falloff, 1 - bestHit.dist / (def.range * 1.15));
      let dmg = def.dmg * falloff;
      if (bestHit.head) dmg *= def.headMul;
      dmg = Math.round(dmg);
      const killed = bestEnemy.hurt(dmg, bestHit.head, origin);
      this.hud.hit(bestHit.head);
      this.vibrate(12);
      this.sfx.hit(bestHit.head);
      p.stats.hits++;
      this.spawnImpact(endPoint, 0xcc2222, 0xaa1111, true);
      if (bestHit.head) p.stats.heads++;
      if (killed) {
        this.onEnemyKilled(bestEnemy, bestHit.head);
      }
    }

    this.tracer(muzzleWorld, endPoint, 0xffe9a0);
    if (p.weapon === 'rifle') this.sfx.rifle(); else this.sfx.pistol();

    // 后坐力
    p.recoilPitch += def.recoil * (0.75 + Math.random() * 0.5);
    p.recoilYaw += (Math.random() - 0.5) * def.recoil * 0.9;
    this.recoil = Math.min(1, this.recoil + def.kick * 4);
    this.flashT = 0.055;
    this.flash.visible = p.weapon === 'rifle';
    this.flash2.visible = p.weapon === 'pistol';
    const fs = 0.42 + Math.random() * 0.22;
    this.flash.scale.set(fs, fs, 1);
    this.flash.material.rotation = Math.random() * 6;
    this.flash2.scale.set(fs * 0.7, fs * 0.7, 1);

    this.hud.updateAmmo(p);
  }

  onEnemyKilled(e, head) {
    const p = this.player;
    p.stats.kills++;
    const base = e.tier === 2 ? 150 : e.tier === 1 ? 120 : 100;
    p.stats.score += base + (head ? 50 : 0);
    this.scoreCT++;
    this.hud.updateScore(this.scoreCT, this.scoreT);
    this.hud.killFeed(e.name || 'Hostile', head);
    this.sfx.kill();
    // 掉落弹药
    const a = p.ammo[p.weapon];
    a.reserve = Math.min(p.weapon === 'rifle' ? 240 : 120, a.reserve + (p.weapon === 'rifle' ? 12 : 8));
    p.hp = Math.min(100, p.hp + 4);
    this.hud.updateAmmo(p);
    this.hud.updateVitals(p);
    if (e.tier === 2) this.hud.alert('ELITE ELIMINATED +150', 1.3);
  }

  vibrate(ms) {
    if (this.input.isTouch && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  onPlayerHit(dmg, fromPos) {
    const p = this.player;
    if (p.dead || this.state !== 'playing') return;
    p.hurt(dmg);
    this.hud.updateVitals(p);
    this.hud.hurt();
    this.sfx.hurt();
    this.shake(0.05);
    this.vibrate(45);
    this.scoreT += 0;
  }

  alertShot(pos) {
    // 枪声让附近敌人警觉
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead || e.seesPlayer) continue;
      if (e.pos.distanceTo(pos) < 22) {
        e.state = 'search';
        e.searchT = 3;
        e.lastSeen.copy(p.pos);
        e.hasLastSeen = true;
      }
    }
  }

  onPlayerDeath() {
    this.sfx.lose();
    this.endGame(false);
  }

  onWeaponChanged(w) {
    this.rifleRoot.visible = w === 'rifle';
    this.pistolRoot.visible = w === 'pistol';
    this.switchT = 0.28;
    this.hud.updateAmmo(this.player);
  }

  shake(a) { this.shakeAmt = Math.min(0.12, this.shakeAmt + a); }

  tracer(from, to, color = 0xffe08a) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.scene.add(ln);
    this.tracers.push({ line: ln, t: 0.07 });
    // 拖尾小粒子
    if (this.tracers.length > 40) {
      const old = this.tracers.shift();
      this.scene.remove(old.line); old.line.geometry.dispose();
    }
  }

  spawnImpact(point, colorA = 0x999999, colorB = 0x777777, blood = false) {
    const n = blood ? 7 : 5;
    const geo = new THREE.SphereGeometry(blood ? 0.045 : 0.03, 4, 3);
    const m = new THREE.MeshBasicMaterial({ color: blood ? 0xa01010 : 0xd8cfae });
    const grp = new THREE.Group();
    grp.position.copy(point);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(geo, m);
      s.userData.v = new THREE.Vector3(
        (Math.random() - 0.5) * 2.4,
        Math.random() * 2.2,
        (Math.random() - 0.5) * 2.4
      );
      grp.add(s);
    }
    this.scene.add(grp);
    this.impacts.push({ mesh: grp, t: 0.45, life: 0.45 });
  }

  // ---------------- 暂停 / 结束 ----------------
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.enabled = false;
    this.input.firing = false;
    this.input.exitLock();
    $('pause').classList.remove('hidden');
  }

  resume() {
    if (this.state !== 'paused') return;
    $('pause').classList.add('hidden');
    this.state = 'playing';
    this.input.enabled = true;
    this.clock.getDelta();
    if (!this.input.isTouch) this.input.requestLock();
  }

  quitToMenu() {
    this.state = 'menu';
    this.input.enabled = false;
    this.input.exitLock();
    this.hud.show(false);
    this.enemies.forEach((e) => e.dispose());
    this.enemies = [];
    $('menu').classList.remove('hidden');
    this.showMenuStats();
  }

  endGame(win) {
    this.state = 'end';
    this.input.enabled = false;
    this.input.firing = false;
    this.input.exitLock();
    const p = this.player;
    const acc = p.stats.shots ? Math.round((p.stats.hits / p.stats.shots) * 100) : 0;
    const title = $('endTitle');
    title.textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED';
    title.className = win ? 'win' : 'lose';
    $('endKills').textContent = p.stats.kills;
    $('endHead').textContent = p.stats.heads;
    $('endAcc').textContent = acc + '%';
    $('endScore').textContent = p.stats.score;
    $('endMsg').textContent = win
      ? `Sector cleared in ${Math.round(120 - this.timeLeft)}s — all ${this.totalEnemies} hostiles neutralised.`
      : `You were killed in wave ${this.round}, taking ${p.stats.kills} hostiles with you.`;
    // 记录
    this.best.kills = Math.max(this.best.kills, p.stats.kills);
    this.best.score = Math.max(this.best.score, p.stats.score);
    if (win) this.best.wins++;
    localStorage.setItem('zs_best', JSON.stringify(this.best));
    if (win) this.sfx.win(); else if (!win) {/* lose 已播放 */}
    setTimeout(() => $('end').classList.remove('hidden'), 500);
  }

  // ---------------- 主循环 ----------------
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.isPortrait = h > w * 1.15;
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.quality === 'high' ? 2 : 1.5));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.wCam.aspect = w / h;
    this.wCam.updateProjectionMatrix();
    if (h > w * 1.15) {
      // 竖屏：垂直 FOV 略加大（横向仍然窄），保证能看清前方
      this.camera.fov = Math.min(105, this.settings.fov * 1.12);
    } else {
      this.camera.fov = this.settings.fov;
    }
    this.camera.updateProjectionMatrix();
    // 触屏灵敏度随屏幕尺寸自适应（竖屏更高更灵敏）
    if (this.input) this.input.syncTouchSens();
  }

  updateWeaponView(dt) {
    const p = this.player;
    const root = p.weapon === 'rifle' ? this.rifleRoot : this.pistolRoot;
    const hs = Math.hypot(p.vel.x, p.vel.z);
    const bobX = Math.sin(p.bobT * 2.0) * 0.012 * Math.min(1, hs / 5);
    const bobY = Math.abs(Math.cos(p.bobT * 2.0)) * 0.014 * Math.min(1, hs / 5);

    // 开镜插值
    const adsTarget = this.input.ads && !p.reloading ? 1 : 0;
    this.adsK += (adsTarget - this.adsK) * Math.min(1, dt * 14);
    const a = this.adsK;

    // 后坐
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.switchT = Math.max(0, this.switchT - dt);

    // 换弹动画
    let reloadDrop = 0, reloadRoll = 0;
    if (p.reloading) {
      const k = 1 - p.reloadT / p.def.reloadTime;
      const curve = Math.sin(Math.PI * Math.min(1, k));
      reloadDrop = curve * 0.16;
      reloadRoll = curve * 0.55;
    }

    // 竖屏（手机）时相机水平视野更窄：按宽高比整体缩放武器，避免占满屏幕
    const ar = this.camera.aspect;
    const fit = Math.min(1, Math.max(0.45, ar / 1.55));
    const sc = 0.5 + 0.5 * fit;
    root.scale.setScalar(sc);
    const baseX = (p.weapon === 'rifle' ? 0.235 : 0.21) * fit;
    const baseY = (p.weapon === 'rifle' ? -0.235 : -0.21) * fit;
    const baseZ = (p.weapon === 'rifle' ? -0.36 : -0.32);
    const baseRY = 0.05;

    // 开镜：枪身下移到屏幕底部，只露出机匣与机瞄，视线保持通畅
    const adsX = 0;
    const adsY = p.weapon === 'rifle' ? -0.155 : -0.125;
    const adsZ = -0.44;
    const adsRY = 0;

    let x = baseX + bobX * (1 - a);
    let y = baseY + bobY * (1 - a) - reloadDrop - this.switchT * 0.4;
    let z = baseZ + this.recoil * 0.05 + this.switchT * 0.12;

    x += (adsX - x) * a;
    y += (adsY - y) * a;
    z += (adsZ - z) * a;

    root.position.set(x, y, z);
    root.rotation.x = 0.02 + this.recoil * 0.14 + reloadRoll * 0.6;
    root.rotation.z = 0.02 + reloadRoll * 0.5 + bobX * 1.4 * (1 - a);
    root.rotation.y = baseRY + (adsRY - baseRY) * a + reloadRoll * 0.25;

    // 枪口火光
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flash.visible = false; this.flash2.visible = false; }
    }
  }

  updateCamera(dt) {
    const p = this.player;
    const cam = this.camera;
    cam.rotation.y = p.yaw;
    cam.rotation.x = p.pitch;
    // 晃动
    const hs = Math.hypot(p.vel.x, p.vel.z);
    const bob = Math.min(1, hs / 5.5) * 0.012 * (1 - this.adsK * 0.75);
    const shake = this.shakeAmt;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 0.6);
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    cam.position.set(
      p.pos.x + sx,
      p.pos.y + p.eyeH + Math.sin(p.bobT * 2) * bob + sy,
      p.pos.z
    );
    cam.rotation.z = Math.sin(p.bobT) * bob * 0.25 + sx * 0.6;

    // 开镜：缩小视野
    const baseFov = window.innerHeight > window.innerWidth * 1.15 ? Math.min(105, this.settings.fov * 1.12) : this.settings.fov;
    const targetFov = baseFov - this.adsK * 12;
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 12);
      cam.updateProjectionMatrix();
    }
  }

  updateEffects(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t -= dt;
      t.line.material.opacity = Math.max(0, t.t / 0.07) * 0.85;
      if (t.t <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const im = this.impacts[i];
      im.t -= dt;
      im.mesh.children.forEach((s) => {
        s.position.addScaledVector(s.userData.v, dt);
        s.userData.v.y -= 9 * dt;
        s.scale.multiplyScalar(0.97);
      });
      if (im.t <= 0) {
        this.scene.remove(im.mesh);
        im.mesh.children.forEach((s) => s.geometry.dispose());
        this.impacts.splice(i, 1);
      }
    }
  }

  updateHUD(dt) {
    const p = this.player;
    this.hud.tick(dt);
    this.hud.updateVitals(p);
    // 准星扩散
    const moving = Math.hypot(p.vel.x, p.vel.z) > 2.2;
    const def = p.def;
    let spread = moving ? def.spreadMoving : def.spread;
    if (p.crouch) spread *= 0.7;
    this.hud.setCrossSpread(spread);
    this.hud.el.cross.style.opacity = this.adsK > 0.55 ? '0.18' : '1';
    // 准星敌人检测
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ'));
    const origin = new THREE.Vector3(p.pos.x, p.eye, p.pos.z);
    let onEnemy = false;
    const wall = this.world.raycast(origin, dir, def.range);
    const wd = wall ? wall.dist : def.range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const h = e.rayHit(origin, dir, Math.min(wd, def.range));
      if (h) { onEnemy = true; break; }
    }
    this.hud.setCrossEnemy(onEnemy);
    this.hud.drawRadar(p, this.enemies, this.world);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    try { this.step(); } catch (err) {
      // 单帧异常不应中断游戏循环
      if (!this._errLogged) { console.error('frame error:', err); this._errLogged = true; }
    }
  }

  step() {
    const rawDt = this.clock.getDelta();
    // 自适应性能：持续低帧时自动降低渲染分辨率
    this._fpsAcc = (this._fpsAcc || 0) + rawDt;
    this._fpsN = (this._fpsN || 0) + 1;
    if (this._fpsAcc > 2.5) {
      const fps = this._fpsN / this._fpsAcc;
      this._fpsAcc = 0; this._fpsN = 0;
      if (this.state === 'playing') {
        const cur = this.renderer.getPixelRatio();
        if (fps < 32 && cur > 0.85 && !this._degraded) {
          this.renderer.setPixelRatio(Math.max(0.8, cur - 0.35));
          this.resize();
          if (cur <= 1.2) this._degraded = true;
        } else if (fps > 55 && this._degraded && cur < Math.min(window.devicePixelRatio, 1.5)) {
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          this.resize();
          this._degraded = false;
        }
      }
    }
    const dt = Math.min(rawDt, 0.05);

    if (this.state === 'playing') {
      const p = this.player;
      p.fireCd = Math.max(0, p.fireCd - dt);

      // 自动/半自动射击
      if (this.input.firing) {
        if (p.def.auto || !this._wasFiring) p.tryFire();
      }
      this._wasFiring = this.input.firing;

      p.update(dt, this.input, this.world);

      // 波次生成 / 推进
      this.updateWaves(dt);

      for (const e of this.enemies) e.update(dt, p, this.world);

      // 计时
      this.timeLeft -= dt;
      this.hud.updateTimer(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame(false);
      }
      this.updateHUD(dt);
      // 清理已死亡很久的敌人
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.dead && e.deathT > 6) { e.dispose(); this.enemies.splice(i, 1); }
      }
    } else if (this.state === 'menu') {
      // 菜单背景：缓慢环绕
      this._menuT = (this._menuT || 0) + dt;
      const t = this._menuT * 0.1;
      const cam = this.camera;
      // 在场地内绕中心缓慢环绕，视线略向下俯视战场
      cam.position.set(Math.sin(t) * 13, 3.4 + Math.sin(t * 0.6) * 0.5, Math.cos(t) * 13);
      cam.lookAt(0, 1.2, 0);
      cam.rotation.z = 0;
    }

    if (this.state === 'playing' || this.state === 'paused') {
      this.updateCamera(dt);
      this.updateWeaponView(dt);
      this.updateEffects(dt);
      // 主场景
      this.renderer.render(this.scene, this.camera);
      if (this.state === 'playing') {
        this.renderer.autoClear = false;
        this.renderer.clearDepth();
        this.renderer.render(this.wScene, this.wCam);
        this.renderer.autoClear = true;
      }
    } else if (this.state === 'menu') {
      this.updateEffects(dt);
      this.renderer.render(this.scene, this.camera);
    } else {
      // end 状态仍渲染最后一帧
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.wScene, this.wCam);
      this.renderer.autoClear = true;
    }
  }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

window.addEventListener('load', () => {
  try {
    window.__game = new Game();
  } catch (err) {
    console.error(err);
    const l = document.getElementById('loading');
    if (l) l.innerHTML = '<div class="loader"><p>Failed to initialise: ' + err.message + '</p></div>';
  }
});
