// 主游戏：渲染、射击、回合管理、UI 绑定
import * as THREE from '../vendor/three.module.min.js?v=20261031232616';
import { World, ARENA, MAPS, getMap } from './world.js?v=20261031232616';
import { Player, Enemy, WEAPONS } from './game.js?v=20261031232616';
import { HUD } from './ui.js?v=20261031232616';
import { Input } from './input.js?v=20261031232616';
import { Sfx } from './audio.js?v=20261031232616';
import { buildRifle, buildPistol, flashTexture } from './assets.js?v=20261031232616';

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
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, 1, 0.05, 3000);
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
    this.camera.far = 3000;
    this.camera.updateProjectionMatrix();
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
    this.rifleRoot.position.set(0.055, -0.125, -0.82);
    this.pistolRoot.position.set(0.075, -0.125, -0.5);
    this.rifleRoot.rotation.set(0.015, 0.15, 0.02);
    this.pistolRoot.rotation.set(0.015, 0.2, 0.02);
    // 枪管轴线锚点必须挂在 Root 上：updateWeaponView 读的是 root.userData.axis，
    // 挂在模型自身上会导致手枪静默退回步枪的兜底参数（枪口偏出 42–77px）。
    this.rifleRoot.userData.axis = this.rifle.userData.axis;
    this.pistolRoot.userData.axis = this.pistol.userData.axis;
    this.pistolRoot.visible = false;
    this.wScene.add(this.rifleRoot, this.pistolRoot);

    // 枪口火光：核心亮斑 + 外层橙色光晕 + 点光源（照亮枪身与环境）
    const mkFlashMat = (color, opacity = 1) => new THREE.SpriteMaterial({
      map: this.flashTex, color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    });
    const mkMuzzle = (pos, coreS, haloS, lightDist) => {
      const grp = new THREE.Group();
      const core = new THREE.Sprite(mkFlashMat(0xfff3c4, 1));
      core.scale.set(coreS, coreS, 1);
      const halo = new THREE.Sprite(mkFlashMat(0xff8a1e, 0.75));
      halo.scale.set(haloS, haloS, 1);
      const spark = new THREE.Sprite(mkFlashMat(0xffd070, 0.9));
      spark.scale.set(coreS * 0.5, coreS * 2.1, 1);   // 纵向拉长的火花瓣
      const light = new THREE.PointLight(0xffa544, 0, lightDist, 2);
      grp.add(halo, core, spark, light);
      grp.position.copy(pos);
      grp.visible = false;
      grp.userData = { core, halo, spark, light, coreS, haloS };
      return grp;
    };
    this.flashG = mkMuzzle(new THREE.Vector3(0, 0.022, -0.7), 0.34, 0.76, 1.6);
    this.rifle.add(this.flashG);
    this.flashG2 = mkMuzzle(new THREE.Vector3(0, 0.012, -0.3), 0.36, 0.76, 1.2);
    this.pistol.add(this.flashG2);
    this.flash = this.flashG.userData.core;    // 兼容旧引用
    this.flash2 = this.flashG2.userData.core;
    // 环境枪口光（主场景，照亮前方地面/墙壁）
    this.muzzleLight = new THREE.PointLight(0xffa544, 0, 14, 2);
    this.scene.add(this.muzzleLight);

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

  /** 构建地图下拉菜单 */
  buildMapPicker() {
    const sel = $('mapSelect');
    if (!sel) return;
    sel.innerHTML = '';
    for (const m of MAPS) {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.name;
      sel.appendChild(o);
    }
    sel.value = this.settings.map;
    this.updateMapDesc();
    // change 事件在移动端最可靠；input 作为兜底
    sel.addEventListener('change', () => this.pickMap(sel.value));
  }

  updateMapDesc() {
    const m = getMap(this.settings.map);
    const d = $('mapDesc');
    if (d) d.textContent = m.desc;
  }

  /** 切换地图：即时重建世界，让背景预览也能看到新图 */
  pickMap(id) {
    if (!MAPS.some((m) => m.id === id)) id = MAPS[0].id;
    const sel = $('mapSelect');
    if (sel && sel.value !== id) sel.value = id;
    if (id === this.settings.map && this.world && this.world.mapId === id) {
      this.updateMapDesc();
      return;
    }
    this.settings.map = id;
    this.loadMap(id);
    this.updateMapDesc();
    // 菜单相机复位
    this._menuT = 0;
    this.showMenuStats();
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
    this.hud.alert(n === 1 ? 'WAVE 1|HOSTILES INBOUND' : `WAVE ${n}|${cfg.count} HOSTILES`, 2.0);
    this.hud.roundInfo(`WAVE ${n} / 3 · ${this.waveQueue.length} LEFT`);

    // 每波补充弹药
    if (n > 1) {
      this.player.ammo.rifle.reserve = Math.min(240, this.player.ammo.rifle.reserve + 90);
      this.player.ammo.pistol.reserve = Math.min(56, this.player.ammo.pistol.reserve + 21);
      this.player.armor = Math.min(100, this.player.armor + 25);
      this.player.hp = Math.min(100, this.player.hp + 20);
      this.hud.updateAmmo(this.player);
      this.hud.updateVitals(this.player);
      this.hud.alert('RESUPPLIED|AMMO · ARMOR · HEALTH', 1.8);
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
        this.hud.alert('WAVE CLEAR|STANDBY FOR NEXT', 2.2);
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
    this.flashT = 0.13;
    const isRifle = p.weapon === 'rifle';
    const fg = isRifle ? this.flashG : this.flashG2;
    const u = fg.userData;
    fg.visible = true;
    // 每发随机化：亮度/大小/旋转，避免每帧火光一模一样
    const fs = 0.85 + Math.random() * 0.45;
    u.core.scale.set(u.coreS * fs, u.coreS * fs, 1);
    u.core.material.rotation = Math.random() * 6;
    u.halo.scale.set(u.haloS * fs * (0.9 + Math.random() * 0.3), u.haloS * fs * (0.9 + Math.random() * 0.3), 1);
    u.halo.material.rotation = Math.random() * 6;
    u.halo.material.opacity = 0.65 + Math.random() * 0.3;
    u.spark.scale.set(u.coreS * 0.4 * fs, u.coreS * (1.6 + Math.random() * 1.2) * fs, 1);
    u.spark.material.rotation = Math.random() * 6;
    u.light.intensity = isRifle ? 9 : 7;
    this.muzzleLight.intensity = isRifle ? 26 : 18;

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
    a.reserve = Math.min(p.weapon === 'rifle' ? 240 : 56, a.reserve + (p.weapon === 'rifle' ? 12 : 7));
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
    // 旧版兼容：若 flashT 由旧路径设置过但闪烁组未显示，则直接打开
    if (this.flashT > 0) {
      const act = p.weapon === 'rifle' ? this.flashG : this.flashG2;
      if (!act.visible && this.flashT > 0.12) act.visible = true;
    }
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

    // 两把枪的机瞄高度不同：AK 用照门，沙漠之鹰用套筒顶部肋条
    // rest 为腰射时的枪身位置（偏右下，符合经典 CS 手感）；
    // 但朝向由下面的反解校正，保证枪口正落在准星正下方的轴线上
    // rest.y 比旧版抬高 0.05：反解会把枪口压到准星下方，若不抬高，
    // 枪身后半截（枪托/握把）会顶到屏幕底边被裁掉，看起来像断了一截。
    const sights = p.weapon === 'rifle'
      ? { rest: [0.040, -0.110, -0.82], ads: [0.0, -0.16, -0.62], ry: 0.15 }
      : { rest: [0.048, -0.115, -0.5], ads: [-0.01, -0.175, -0.42], ry: 0.2 };
    const fit = Math.min(1, Math.max(0.62, this.camera.aspect / 1.65));
    // 竖屏时相机水平视野窄：武器整体缩小 + 后移，避免枪身糊满下半屏
    const portrait = this.camera.aspect < 1 ? 1 : 0;
    // 手枪比步枪短很多，用同一套尺寸会显得又大又近、糊住下半屏，单独收一档
    const wScale = p.weapon === 'rifle' ? 1 : 0.86;
    const sc = (0.56 + 0.44 * fit) * (1 - 0.22 * portrait) * wScale;
    const dolly = (1 + 0.3 * portrait) * (p.weapon === 'rifle' ? 1 : 1.12);
    root.scale.setScalar(sc);

    const [rx0, ry0, rz0] = sights.rest;
    const [ax0, ay0, az0] = sights.ads;
    const adsRY = 0;

    let x = rx0 * fit * (1 - 0.3 * portrait) + bobX * (1 - a);
    let y = ry0 * (1 - 0.08 * portrait) + bobY * (1 - a) - reloadDrop - this.switchT * 0.4;
    let z = rz0 * dolly + this.recoil * 0.05 + this.switchT * 0.12;

    x += (ax0 * fit - x) * a;
    y += (ay0 - y) * a;
    z += (az0 * dolly - z) * a;

    // 枪把（枪身支点）在腰射时右移一点：枪口保持不动，枪身向右下展开，
    // 视觉上枪的轮廓更完整、更有体积感。开镜时归零，保证机瞄居中。
    x += (p.weapon === 'rifle' ? 0.032 : 0.026) * (1 - a);

    // ---- 枪身姿态：让枪口落在准星正下方 ----
    // 目标：把枪口锚点搬到"准星正下方 offsetY"的位置（屏幕正下方一点点），
    // 同时枪管轴线竖直向上穿过准星——即枪口在准星的正下方、同一竖线上。
    // 开镜时 offsetY→0，枪口退化为精确压在准星上，即机瞄。
    // 欧拉序 XYZ 下俯仰与横摆互相耦合、素材局部轴向不易硬推，
    // 所以直接在真实相机投影里反解：把候选变换写进 root，读 matrixWorld 投影，
    // 用一维割线法让枪口的投影 x 落到 0、y 落到 offsetY。
    const axis = root.userData.axis || { x: 0, y: 0.02, z: -0.6, rear: 0 };
    const kick = this.recoil * 0.14;
    const baseRotZ = (p.weapon === 'rifle' ? 0.02 : 0.015) * (1 - a);
    const _p = new THREE.Vector3();
    // 腰射时枪口停在准星下方的屏幕比例（0.16 ≈ 向下 16% 半屏高），开镜归零。
    // 步枪长、可以停得低一些；手枪短，低了就和准星脱节，所以小一点。
    // 腰射时枪口停在准星下方的屏幕比例（0.16 ≈ 向下 16% 半屏高），开镜归零。
    // 步枪长、可以停得低一些；手枪短，低了就和准星脱节，所以小一点。
    const offY = (p.weapon === 'rifle' ? 0.135 : 0.105) * (1 - a);
    // 把 (pos, rx, ry, rz) 实际写进 root 并返回枪口投影（NDC）
    const project = (px, py, pz, rx, ry, rz) => {
      root.position.set(px, py, pz);
      root.rotation.set(rx, ry, rz);
      root.updateMatrixWorld(true);
      _p.set(axis.x || 0, axis.y, axis.z).applyMatrix4(root.matrixWorld).project(this.wCam);
      return _p;
    };
    // 一维割线法：单调求解 f(t)=0
    const solve = (f, t0, lo, hi) => {
      let a0 = t0, fa = f(a0);
      let b0 = a0 + 0.02, fb = f(b0);
      for (let i = 0; i < 9; i++) {
        if (Math.abs(fb) < 1e-7 || fb === fa) break;
        let t = b0 - fb * (b0 - a0) / (fb - fa);
        if (!Number.isFinite(t)) t = (a0 + b0) * 0.5;
        t = Math.max(lo, Math.min(hi, t));
        a0 = b0; fa = fb;
        b0 = t; fb = f(b0);
      }
      return b0;
    };
    // 交叉迭代：横向解 rot.y（让枪口横坐标落到屏幕中心），纵向解 rot.x（落到 offsetY）。
    // 表现层偏移（后坐 / 换弹 / 走动）在反解时就一并计入，解出来即最终呈现。
    const mix = THREE.MathUtils.lerp(0.92, 1, a);
    let pitchTo = 0.16, yawTo = 0;
    for (let i = 0; i < 8; i++) {
      yawTo = solve((t) => project(x, y, z, pitchTo * mix + kick + reloadRoll * 0.6, t * mix + reloadRoll * 0.25, baseRotZ).x,
        yawTo, -1.3, 1.3);
      pitchTo = solve((t) => project(x, y, z, t * mix + kick + reloadRoll * 0.6, yawTo * mix + reloadRoll * 0.25, baseRotZ).y + offY * mix,
        pitchTo, -1.0, 1.0);
    }

    // 姿态：反解结果直接写入（已含后坐 / 换弹 / 走动的表现层偏移）
    root.rotation.x = pitchTo * mix + kick + reloadRoll * 0.6;
    root.rotation.y = yawTo * mix + reloadRoll * 0.25;
    root.rotation.z = baseRotZ
      + reloadRoll * 0.5 + bobX * 1.2 * (1 - a) + this.recoil * 0.05;
    root.position.set(x, y, z);
    root.updateWorldMatrix(true, true);

    // 枪口火光：快速衰减（核心→光晕→熄灭），并同步点光源强度
    if (this.flashT > 0) {
      this.flashT -= dt;
      const active = this.player.weapon === 'rifle' ? this.flashG : this.flashG2;
      const k = Math.max(0, this.flashT / 0.13);
      for (const fg of [this.flashG, this.flashG2]) {
        const u = fg.userData;
        if (fg !== active) { fg.visible = false; u.light.intensity = 0; continue; }
        u.core.material.opacity = Math.min(1, k * 1.6);
        u.halo.material.opacity = u.halo.material.opacity * Math.min(1, k * 1.3);
        u.spark.material.opacity = k;
        u.light.intensity = (this.player.weapon === 'rifle' ? 9 : 7) * k;
      }
      this.muzzleLight.intensity = (this.player.weapon === 'rifle' ? 26 : 18) * k;
      if (this.flashT <= 0) {
        this.flashG.visible = false; this.flashG2.visible = false;
        this.flashG.userData.light.intensity = 0; this.flashG2.userData.light.intensity = 0;
        this.muzzleLight.intensity = 0;
      }
    }
    // 环境枪口光跟随相机（位于玩家前方约 0.6m）
    if (this.muzzleLight.intensity > 0) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.muzzleLight.position.copy(this.camera.position).addScaledVector(dir, 0.7);
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
