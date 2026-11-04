// Main game: rendering, shooting, round flow, UI wiring
import * as THREE from '../vendor/three.module.min.js?v=20261104165408';
import { World, ARENA, MAPS, getMap } from './world.js?v=20261104165408';
import { Player, Enemy, WEAPONS } from './game.js?v=20261104165408';
import { HUD } from './ui.js?v=20261104165408';
import { Input } from './input.js?v=20261104165408';
import { Sfx } from './audio.js?v=20261104165408';
import { buildRifle, buildPistol, flashTexture, streakTexture } from './assets.js?v=20261104165408';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ENEMY_NAMES = ['Ghost', 'Anvil', 'Viper', 'Fang', 'Nightowl', 'Vulture', 'Blade', 'Sandstorm', 'Thunder', 'Cutthroat', 'Falcon', 'Tiger'];

// Scratch vectors for aim assist: reused every frame so the hot path allocates nothing
const _aaEye = new THREE.Vector3();
const _aaDir = new THREE.Vector3();
const _aaTarget = new THREE.Vector3();
const _aaV1 = new THREE.Vector3();
const _aaV2 = new THREE.Vector3();
const _aaEuler = new THREE.Euler(0, 0, 0, 'YXZ');

class Game {
  constructor() {
    this.settings = {
      sens: (() => {
        // One-time migration: the look baseline was recalibrated to 0.34 screen widths per
        // half turn, which is exactly the feel the tester dialled in with the old slider.
        // Values stored under the old baselines (0.42 / 0.30 / 0.24 screen widths) were all
        // below 1.0 while searching for that feel -- 0.7, 0.75 and the like -- and applying
        // one of them on top of the new baseline would double-slow the view. Anything below
        // 1.0 left over from that search is reset; a deliberate choice made under the new
        // baseline can simply be set again on the slider.
        const v = parseFloat(localStorage.getItem('zs_sens') || '1');
        if (v < 1) { localStorage.setItem('zs_sens', '1'); return 1; }
        return v;
      })(),
      fov: parseInt(localStorage.getItem('zs_fov') || '85'),
      quality: localStorage.getItem('zs_quality') || 'low',
      sound: localStorage.getItem('zs_sound') !== '0',
      map: localStorage.getItem('zs_map') || 'depot',
      // Aim assist: on touch screens it is hard to stop a thumb-dragged view
      // exactly on an enemy, so the view is nudged toward one when the crosshair gets close.
      //   · No settings toggle: fixed per device -- on for touch, off for mouse
      //     (a mouse is already precise; assist just feels sticky there).
      //   · maxAngle: capture radius in degrees, measured from screen centre
      //   · strength: peak pull, 0..1, falling off quadratically with angular error
      //   · rate: convergence speed (higher feels faster and stiffer)
      //   · headRatio: aim for the head only inside maxAngle * this
      // Tuning history: 0.85 (too strong) -> 0.45 (too weak) -> 0.68 (current, in between)
      aimAssist: {
        on: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        maxAngle: 6,
        strength: 0.68,
        rate: 17,
        headRatio: 0.42,
      },
    };
    this.state = 'menu'; // menu | playing | paused | end
    this.clock = new THREE.Clock();
    this.sfx = new Sfx();
    this.sfx.enabled = this.settings.sound;
    this.tracers = [];
    this.impacts = [];
    this.flashes = [];
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
    // Lighting
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

    // Muzzle flash textures
    this.flashTex = flashTexture();
  }

  /** Switch map: dispose the old scene objects, rebuild the world, reset the player */
  loadMap(id) {
    if (this.world) this.world.dispose();
    this.settings.map = id;
    localStorage.setItem('zs_map', id);
    this.world = new World(this.scene, this.settings.quality, id);
    // Ground tint variation: a slight tweak to the fill light
    const m = getMap(id);
    const warm = id === 'harbor';
    this.sun.color.setHex(warm ? 0xffe0bc : 0xfff4e2);
    this.sun.intensity = warm ? 2.9 : 3.4;
    this.hemi.intensity = warm ? 2.6 : 2.9;
    this.fill.intensity = warm ? 1.6 : 1.3;
    // Clear enemies and effects
    this.enemies.forEach((e) => e.dispose());
    this.enemies = [];
    this.tracers.forEach((t) => { const m = t.mesh || t.line; this.scene.remove(m); m.geometry.dispose(); if (m.material) m.material.dispose(); });
    this.tracers = [];
    this.impacts.forEach((i) => this.scene.remove(i.mesh));
    this.impacts = [];
    this.flashes.forEach((f) => this.scene.remove(f.grp));
    this.flashes = [];
    // Point the menu camera at the map centre
    this.camera.far = 3000;
    this.camera.updateProjectionMatrix();
  }

  initWeaponView() {
    // The first-person weapon lives in its own scene so it never clips through walls
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
    // The barrel-axis anchor must hang off Root: updateWeaponView reads root.userData.axis,
    // so putting it on the model itself makes the pistol silently fall back to the rifle defaults (muzzle off by 42-77px).
    this.rifleRoot.userData.axis = this.rifle.userData.axis;
    this.pistolRoot.userData.axis = this.pistol.userData.axis;
    this.pistolRoot.visible = false;
    this.wScene.add(this.rifleRoot, this.pistolRoot);

    // Muzzle flash: bright core + orange halo + point light that lights the gun and surroundings
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
      spark.scale.set(coreS * 0.5, coreS * 2.1, 1);   // vertically stretched spark petal
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
    this.flash = this.flashG.userData.core;    // kept for older references
    this.flash2 = this.flashG2.userData.core;
    // World muzzle light (main scene: lights the ground/walls ahead)
    this.muzzleLight = new THREE.PointLight(0xffa544, 0, 14, 2);
    this.scene.add(this.muzzleLight);

    // Recoil / sway state
    this.recoil = 0;
    this.sway = { x: 0, y: 0 };
    this.flashT = 0;
    this.switchT = 0;
  }

  // ---------------- UI binding ----------------
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
        // Do not scroll the page on Space in the menu or after the round ends
      }
    });

    // Clicking the canvas re-acquires pointer lock
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.input.locked && !this.input.isTouch) this.input.requestLock();
    });
  }

  setupTouchMode() {
    const touch = this.input.isTouch || (window.matchMedia('(pointer:coarse)').matches && navigator.maxTouchPoints > 0);
    document.body.classList.toggle('touchmode', touch);
    $('touch').classList.toggle('hidden', !touch);
  }

  /** Build the map dropdown */
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
    // 'change' is the most reliable event on mobile; 'input' is the fallback
    sel.addEventListener('change', () => this.pickMap(sel.value));
  }

  updateMapDesc() {
    const m = getMap(this.settings.map);
    const d = $('mapDesc');
    if (d) d.textContent = m.desc;
  }

  /** Switch map: rebuild the world immediately so the background preview shows the new one */
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
    // Reset the menu camera
    this._menuT = 0;
    this.showMenuStats();
  }

  showMenuStats() {
    $('bestKills').textContent = this.best.kills;
    $('bestScore').textContent = this.best.score;
    $('bestWins').textContent = this.best.wins;
  }

  // ---------------- Round flow ----------------
  startGame() {
    this.sfx.init();
    $('menu').classList.add('hidden');
    $('end').classList.add('hidden');
    $('pause').classList.add('hidden');
    $('help').classList.add('hidden');
    // Clear enemies
    this.enemies.forEach((e) => e.dispose());
    this.enemies = [];
    this.tracers.forEach((t) => { const m = t.mesh || t.line; this.scene.remove(m); m.geometry.dispose(); if (m.material) m.material.dispose(); });
    this.tracers = [];
    this.impacts.forEach((i) => this.scene.remove(i.mesh));
    this.impacts = [];
    this.flashes.forEach((f) => this.scene.remove(f.grp));
    this.flashes = [];

    this.player.reset();
    // Important: reset() restores the weapon (it keeps last round's choice), but **visibility does not follow**.
    // If the last round ended on the pistol, pistolRoot is still visible and rifleRoot still hidden, so the new round starts
    // out of sync -- it looks like a pistol in hand while the state says rifle: firing lights the rifle's
    // flash node (a gun that was never drawn), so no muzzle flash and no visible recoil.
    this.onWeaponChanged(this.player.weapon);
    this.recoil = 0;
    this.flashT = 0;
    this.switchT = 0;
    this.flashG.visible = false;
    this.flashG2.visible = false;
    this.flashG.userData.light.intensity = 0;
    this.flashG2.userData.light.intensity = 0;
    this.muzzleLight.intensity = 0;
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

    // Crosshair / view
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

    // Refill ammo each wave
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
    // Score spawn candidates: not blocking the player's line of fire, not overlapping another enemy, not too close
    const spawns = this.world.spawns;
    let best = null, bestScore = -1e9;
    const origin = new THREE.Vector3(this.player.pos.x, this.player.eye, this.player.pos.z);
    for (const s of spawns) {
      const d = s.distanceTo(this.player.pos);
      if (d < 11) continue;
      let score = 26 - Math.abs(d - 19) + Math.random() * 5;
      // Clear line of sight (a clear spot plays fairer)
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
    // Record the shot time: aim assist uses it to weaken the pull while firing continuously,
    // otherwise recoil kicking up and assist pulling back fight each other each shot and the view jitters.
    this._aaFireT = performance.now() / 1000;
    const origin = new THREE.Vector3(p.pos.x, p.eye, p.pos.z);
    // View direction
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ'));

    // Spread
    const moving = Math.hypot(p.vel.x, p.vel.z) > 2.2;
    const airborne = !p.onGround;
    let spread = moving ? def.spreadMoving : def.spread;
    if (airborne) spread *= 1.5;
    if (p.crouch) spread *= 0.7;
    spread *= 1 + (1 - p.ammo[p.weapon].mag / def.magSize) * 0.15; // spread grows slightly as the mag empties

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

    // Enemy hit
    for (const e of this.enemies) {
      if (e.dead) continue;
      const hit = e.rayHit(origin, shotDir, maxD);
      if (hit && (!bestHit || hit.dist < bestHit.dist)) { bestHit = hit; bestEnemy = e; }
    }
    // Wall
    const wall = this.world.raycast(origin, shotDir, maxD);
    if (wall && (!bestHit || wall.dist < bestHit.dist)) {
      endPoint = wall.point;
      this.spawnImpact(wall.point, 0x9a9484, wall.box.maxY > 2.5 ? 0x8a8478 : 0x6f6a5e);
      bestEnemy = null; bestHit = null;
    } else if (bestHit) {
      endPoint = origin.clone().addScaledVector(shotDir, bestHit.dist);
      // Damage falloff
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

    // Recoil: booked as a debt against the pitch the burst started from, so the view kicks up
    // and then comes back down on its own instead of climbing a little with every shot.
    p.climbRecoil(def.recoil * (0.75 + Math.random() * 0.5));
    p.recoilYaw += (Math.random() - 0.5) * def.recoil * 0.9;
    this.recoil = Math.min(1, this.recoil + def.kick * 4);
    this.flashT = 0.13;
    const isRifle = p.weapon === 'rifle';
    const fg = isRifle ? this.flashG : this.flashG2;
    const u = fg.userData;
    fg.visible = true;
    // Randomise each shot: brightness / size / rotation, so the flash is never identical
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
    // Ammo drops
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
    // Gunshots alert nearby enemies
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
    // Both weapons are **always visible**; the inactive one is pushed out of view below the screen via its Y offset.
    //
    // The old code was `visible = (w === 'rifle')`: at the moment of switching, one was lit and the other cut.
    // Visually it popped in and out of nowhere, and at a low frame rate you saw the old one, then the new one,
    // which looks like holding two guns. Also, wScene does not redraw while paused, so resuming snapped it too.
    // With "both present, moved out by position" the switch becomes a continuous sink/lift,
    // and no frame ever shows both guns on screen at once.
    this.rifleRoot.visible = true;
    this.pistolRoot.visible = true;
    // No switch transition animation: while switchT>0 and the new gun rises from below,
    // the pitch solution tracks switchT, so mid-way the gun has a different shape
    // and only settles into the final shape at the end (reported from playtesting). Zeroing it means the switch lands immediately.
    this.switchT = 0;
    this.hud.updateAmmo(this.player);
  }

  shake(a) { this.shakeAmt = Math.min(0.12, this.shakeAmt + a); }

  _dropTracer(i) {
    const t = this.tracers[i];
    if (!t) return;
    const m = t.mesh || t.line;
    if (m) {
      this.scene.remove(m);
      if (m.children && m.children.length) {
        m.children.forEach((c) => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      } else {
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      }
    }
    this.tracers.splice(i, 1);
  }
  tracer(from, to, color = 0xffe08a, stopShort = 0) {
    // Tracers are drawn as a short streak of light in flight.
    // An earlier version drew a THREE.Line straight from muzzle to target, which had two problems:
    //   1) when it hit the player, the line ran into the camera and looked like a long rod stabbing into the body;
    //   2) WebGL line width is always 1px, and in practice it was often invisible on swiftshader and phone GPUs.
    // Now it is a flat plane facing the camera (a Sprite cannot be stretched lengthwise either,
    // hence PlaneGeometry + a self-lit texture), stretched along the trajectory, with only position and scale updated per frame.
    // stopShort: how many metres short of the target the streak dies (used when hitting the player, so it does not land on the face).
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    if (dist < 2.5) return;                      // point-blank shots get muzzle flash only, no streak
    dir.normalize();
    const endDist = Math.max(2, dist - stopShort);
    // Streak speed (m/s): a real bullet travels at 700+, arriving within one frame, so nothing is seen;
    // 140 is the compromise between "you can see it flying" and "not as slow as a thrown object": 14m takes about 0.1s.
    const speed = 140;
    const life = Math.min(0.45, Math.max(0.1, (endDist + 2) / speed));
    // Streak length (m): this is what makes it read as a dart rather than a bar.
    // Length and width must keep a "projectile + trail" ratio (5:1 or more),
    // otherwise 34px wide by 0.9m long is a 1.8:1 block on screen that reads as flying sideways.
    // The trail is now 1.3-2.2m against 26px of width, roughly 6:1 on screen, which gives the dart look.
    const streak = Math.min(2.2, Math.max(1.3, endDist * 0.17));   // streak length in metres
    const span = endDist + streak;

    if (!this._streakTex) this._streakTex = streakTexture();
    // The blend mode matters a lot:
    //   pure Additive is bright in the dark, but the daytime sky is rgb(190,205,220) and adding a little orange
    //   barely changes it, so it looks like the enemy never fired at all (this was the actual bug).
    //   pure Normal turns into a solid block on a bright background and stops reading as light.
    // Compromise: Normal blending at high opacity, with the colour itself pushed toward white-hot warm,
    // so it stays visible on bright and dark backgrounds alike while still reading as light.
    const hot = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55).multiplyScalar(1.15);
    const mat = new THREE.MeshBasicMaterial({
      map: this._streakTex, color: hot, transparent: true, opacity: 1,
      depthWrite: false, depthTest: false,
      side: THREE.DoubleSide, toneMapped: false,
    });
    // One plane is enough, but its orientation must be computed per frame: length along the trajectory, width perpendicular to it and widest on screen.
    // Crossing two planes, and nesting two planes in a Group to stack them, both ended up, when facing the view,
    // rotating the width onto the screen's vertical axis (a vertical bar, i.e. a rod stabbing at you), so it stays a single plane
    // and orientation is handled entirely by _layoutTracer.
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.frustumCulled = false;
    // renderOrder must be above 0: the sky dome uses -1 with depthWrite=false, and
    // transparent objects drawn behind it get painted over by the sky and vanish (the whole streak became invisible).
    mesh.renderOrder = 20;
    this.scene.add(mesh);
    this.tracers.push({ mesh, from, dir, endDist, streak, span, speed, age: 0 });
    while (this.tracers.length > 40) {
      const old = this.tracers.shift();
      this.scene.remove(old.mesh);
      old.mesh.geometry.dispose(); old.mesh.material.dispose();
    }
  }

  // Place the streak so its head is headD metres along: centre = midpoint, length = visible span, orientation = trajectory.
  // The hard part: keeping it a band of light with thickness from any angle, rather than a line or a flat slab.
  _layoutTracer(t, tailD, headD, camPos) {
    const seg = Math.max(0.001, headD - tailD);
    const ax = tailD + seg * 0.5;
    const m = t.mesh;
    m.position.copy(t.from).addScaledVector(t.dir, ax);

    const cam = this.camera;
    const toCam = new THREE.Vector3().subVectors(camPos, m.position);
    const distToCam = Math.max(0.5, toCam.length());
    toCam.normalize();
    const facing = Math.abs(t.dir.dot(toCam));       // 1 = flying straight at you

    // Width axis: the camera right vector projected onto the plane normal to the trajectory.
    // When the shot comes down the line of sight (an enemy firing straight at you), camRight is almost perpendicular to it,
    // so the band spreads steadily across the screen with 8px of thickness -- light you can actually see.
    // (An earlier version projected toCam, which collapses to zero when the trajectory is parallel to the view, leaving 1px of width;
    //   projecting camUp instead fought the length-along-trajectory axis and also degenerated to a hairline.)
    const camRight = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    let up = camRight.clone().addScaledVector(t.dir, -camRight.dot(t.dir));
    if (up.lengthSq() < 1e-4) {
      // Camera right happens to lie along the trajectory (camera and barrel coincident, an extreme case)
      const alt = new THREE.Vector3(0, 1, 0);
      up = alt.addScaledVector(t.dir, -alt.dot(t.dir));
    }
    up.normalize();
    const side = new THREE.Vector3().crossVectors(t.dir, up).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t.dir, up, side));

    // Width is derived from on-screen pixels rather than fixed metres: thin at any range, never 2px at 10m.
    // 26px wide: below 20px the wall texture swallows it, but too wide pushes the aspect ratio toward 1 and it reads as a bar.
    // With the 1.3-2.2m length above that is about 6:1 on screen, which is what a dart should look like.
    const fovRad = (cam.fov * Math.PI) / 180;
    const perPx = (2 * Math.tan(fovRad / 2) * distToCam) / Math.max(1, window.innerHeight);
    let widthM = Math.max(0.02, perPx * 26);
    // Narrow it near the camera: it only thins noticeably within 1.5m of the face; it used to start at 3m,
    // which made the player's own tracers almost invisible too.
    const nearK = Math.min(1, Math.max(0, (distToCam - 0.7) / 1.6));
    widthM *= 0.35 + 0.65 * nearK;

    // Head-on, the trajectory direction collapses to nearly zero on screen and only the width is visible --
    // what the player sees is the face of the projectile, so thicken it slightly to keep it present,
    // but not too much or it turns back into a horizontal bar.
    const widenTip = 1 + facing * facing * 0.35;
    m.scale.set(seg, widthM * widenTip, 1);
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

  // Enemy muzzle flash: a few camera-facing quads forming a burst of fire, plus a brief point light.
  // Enemies used to fire with only a tracer and no flash at the muzzle, so it was hard to notice that someone fired,
  // let alone from which direction. This adds the instant of flash a real firearm gives off.
  spawnMuzzleFlash(pos, dir) {
    if (!this._flashTex) this._flashTex = flashTexture();
    const grp = new THREE.Group();
    grp.position.copy(pos);
    const mk = (size, offset, color, op) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: this._flashTex, color, transparent: true, opacity: op,
          blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
          side: THREE.DoubleSide, toneMapped: false,
        })
      );
      m.scale.setScalar(size);
      m.position.copy(offset);
      grp.add(m);
      return m;
    };
    // A fireball facing the camera plus a cone stretched along the barrel
    const ball = mk(1, new THREE.Vector3(0, 0, 0), 0xffe0a0, 1);
    const cone = mk(1, new THREE.Vector3(0, 0, 0), 0xffb050, 0.9);
    // Flash size follows distance: an enemy at 15m is only tens of pixels tall,
    // so a fixed 0.6m flash is about 10 pixels on screen and might as well not be there.
    // Scaling by distance keeps it about 55px on screen, visible near or far.
    const dCam = pos.distanceTo(this.camera.position);
    const fovRad0 = (this.camera.fov * Math.PI) / 180;
    const perPx0 = (2 * Math.tan(fovRad0 / 2) * dCam) / Math.max(1, window.innerHeight);
    const flashSize = Math.max(0.55, perPx0 * 55);
    grp.userData.base = flashSize;
    grp.userData.dir = dir.clone().normalize();
    grp.userData.ball = ball;
    grp.userData.cone = cone;
    // Point light: briefly lights the ground near the muzzle and the enemy themselves, the strongest cue for a flash
    const light = new THREE.PointLight(0xffb060, 6, 6, 2);
    grp.add(light);
    this.scene.add(grp);
    // 130ms: a real muzzle flash lasts 30-50ms, but at this range (8-15m) and size,
    // 90ms is only 5 frames at 60fps and players blink and miss it, which is as good as not doing it.
    // Stretching it to 130ms still reads as a flash but is reliably noticed.
    this.flashes.push({ grp, t: 0.13, life: 0.13, light });
    // Hard cap: keep the array from growing without bound in extreme cases (a whole wave spawning and firing at once).
    // Normally no more than a dozen are alive at once, so 40 is generous.
    while (this.flashes.length > 40) {
      const old = this.flashes.shift();
      this.scene.remove(old.grp);
      old.grp.children.forEach((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
  }

  // ---------------- Pause / end ----------------
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
    // Record
    this.best.kills = Math.max(this.best.kills, p.stats.kills);
    this.best.score = Math.max(this.best.score, p.stats.score);
    if (win) this.best.wins++;
    localStorage.setItem('zs_best', JSON.stringify(this.best));
    if (win) this.sfx.win(); else if (!win) {/* loss sound already played */}
    setTimeout(() => $('end').classList.remove('hidden'), 500);
  }

  // ---------------- Main loop ----------------
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.isPortrait = h > w * 1.15;
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.quality === 'high' ? 2 : 1.5));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // ---- Weapon camera: same field of view in landscape and portrait ----
    // The weapon lives in its own scene (wScene + wCam) and does not follow the main camera, so its FOV is set here.
    //
    // Goal: make the gun have **exactly the same shape** in both aspect ratios.
    // Shape is set by the perspective angle the camera sees the gun at, i.e. the vertical FOV -- keep that constant
    // and the foreshortening is identical; a narrower frame only crops the sides and does not change the gun.
    // So both use a 55 degree vertical FOV, and portrait no longer scales it up.
    // (Locking horizontal FOV and solving for the portrait vertical FOV gave 105 degrees:
    //   the wide angle blew out the perspective, and to land the muzzle in the same spot the pitch had to rise to 0.44,
    //   standing the pistol up like a pillar. Matching vertical FOV is the right call.)
    this.wCam.fov = 55;
    this.wCam.aspect = w / h;
    this.wCam.updateProjectionMatrix();
    if (h > w * 1.15) {
      // Portrait: widen the vertical FOV a little (the horizontal stays narrow) so you can see ahead
      this.camera.fov = Math.min(105, this.settings.fov * 1.12);
    } else {
      this.camera.fov = this.settings.fov;
    }
    this.camera.updateProjectionMatrix();
    // Touch sensitivity adapts to screen size (taller portrait screens need more)
    if (this.input) this.input.syncTouchSens();
  }

  updateWeaponView(dt) {
    const p = this.player;
    // Legacy path: if flashT was set elsewhere but the flash group is not shown, turn it on
    if (this.flashT > 0) {
      const act = p.weapon === 'rifle' ? this.flashG : this.flashG2;
      if (!act.visible && this.flashT > 0.12) act.visible = true;
    }
    const root = p.weapon === 'rifle' ? this.rifleRoot : this.pistolRoot;
    const hs = Math.hypot(p.vel.x, p.vel.z);
    // Walk bob: toned down one notch on both weapons. At 0.012/0.014 walking shook badly,
    // especially the pistol (light, and large on screen, so the sway was exaggerated).
    // 0.0062/0.0072 is about 52% of that: you still feel the walk, but it no longer swings your aim.
    const bobX = Math.sin(p.bobT * 2.0) * 0.0062 * Math.min(1, hs / 5);
    const bobY = Math.abs(Math.cos(p.bobT * 2.0)) * 0.0072 * Math.min(1, hs / 5);

    // There is no ADS: the AK-47 uses iron sights and the Desert Eagle a fixed front post, both hip-fired.
    // An adsK interpolation (0..1) used to run through the whole pose solve and has been removed.
    // Many formulas below still carry (1 - a) factors; a is always 0, i.e. permanent hip-fire,
    // kept so the hand-tuned coefficients stay untouched.
    const a = 0;

    // Recoil
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.switchT = Math.max(0, this.switchT - dt);

    // Reload animation
    // Reload: the drop must go into wantY (writing it into y is cancelled by parkMuzzle, measured displacement 0)
    //
    // [Why it used to feel choppy] A single sin(pi*k) bell curve drove both the drop and the roll:
    //   it reached 90% of peak at k=0.30, so over the next 40% of the time (k=0.30-0.70) the gun moved only 10%,
    //   frames 16-24 held at exactly 0.1269 -- stuck at the bottom for a full 0.3 seconds,
    //   then it suddenly snapped back. Not a frame rate problem: the curve itself stalled.
    // It is now split into four segments, each starting where the last ended, paced like a real reload:
    //   t0 0.00-0.16  quick drop plus tilt (easeOut)
    //   t0 0.16-0.38  hold low, with a slight magazine-pull wobble (faded in and out)
    //   t0 0.38-0.72  ease up 1.00 -> 0.86, lifting the fresh magazine into place
    //   t0 0.72-1.00  0.86 -> 0 seated (easeInOut: accelerates in, decelerates on landing)
    let reloadDrop = 0, reloadRoll = 0, reloadBob = 0;
    if (p.reloading) {
      const t0 = 1 - p.reloadT / p.def.reloadTime;   // 0 -> 1
      const eOut = (x) => 1 - (1 - x) * (1 - x);
      const eInOut = (x) => x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
      // Important: each segment must start at the previous segment's end value, or the seam jumps.
      // The first version ended the 0.46->0.80 segment at 0.72 and the next started back at 1.0,
      // a one-frame move of 0.0234 (4x the average) that looked like a twitch.
      // Writing each segment as lerp(previous end, this end, ease) removes the seam.
      let k;
      if (t0 < 0.16) {
        k = eOut(t0 / 0.16) * 1.00;                          // quick drop
      } else if (t0 < 0.38) {
        k = 1.00;                                            // hold low
        const u = (t0 - 0.16) / 0.22;
        reloadBob = Math.sin(u * Math.PI * 2) * 0.035;       // slight magazine-pull wobble
      } else if (t0 < 0.72) {
        k = 1.00 + (0.86 - 1.00) * eInOut((t0 - 0.38) / 0.34); // 1.00 -> 0.86, ease in and out
      } else {
        // The last segment covers 86% of the return in 28% of the time: still the fastest part, but easeInOut
        // gives it acceleration and a soft landing, so the seam velocity does not jump from 0 to peak.
        k = 0.86 + (0.00 - 0.86) * eInOut((t0 - 0.72) / 0.28);
      }
      // The wobble only applies during the low hold, faded in and out across the window so it never starts abruptly
      const bobW = t0 > 0.16 && t0 < 0.38 ? Math.min(1, Math.min(t0 - 0.16, 0.38 - t0) / 0.05) : 0;
      const depth = p.weapon === 'rifle' ? 0.085 : 0.062;
      const tilt = p.weapon === 'rifle' ? 0.50 : 0.46;
      reloadDrop = (k + reloadBob * bobW) * depth;
      reloadRoll = (k + reloadBob * 0.6 * bobW) * tilt;
    }

    // The two weapons have different sight heights: the AK uses the rear notch, the Desert Eagle the slide-top rib
    // rest is the hip-fire body position (down and right, the classic CS feel);
    // the orientation is corrected by the solve below so the muzzle lands on the axis just under the crosshair
    // rest.y sits 0.05 higher than before: the solve pushes the muzzle below the crosshair, and without the lift
    // the rear half of the gun (stock/grip) hits the bottom edge and gets cropped, as if cut off.
    // Hip-fire position only. There used to be an ADS position (gun pulled to centre screen),
    // and with no ADS that branch is gone.
    const sights = p.weapon === 'rifle'
      ? { rest: [0.040, -0.110, -0.82] }
      : { rest: [0.116, -0.128, -0.60] };
    // fit decides how much of the frame the gun fills. In portrait wCam keeps the same vertical FOV,
    // but the horizontal view is narrower -- using the true aspect would clamp fit to its floor and shrink the gun,
    // and the solve would then raise the pitch to stay aligned. Portrait borrows the landscape equivalent aspect here
    // so size and pitch match landscape; the main camera handles the side cropping of a narrow frame.
    const fitAspect = this.camera.aspect < 1 ? 1.78 : this.camera.aspect;
    const fit = Math.min(1, Math.max(0.62, fitAspect / 1.65));
    // [Portrait unified with landscape] portrait=1 used to cascade into scale / dolly / offY / lateral bias / yaw,
    // each one stuffing the gun back into the narrow frame, and together they bent the pistol into a vertical pillar.
    // The weapon camera now has the same horizontal view as landscape (see the horizontal-FOV solve in resize),
    // so pose, size and offsets can copy the landscape set and the shape follows for free.
    // Portrait still needs an overall shrink so the gun does not plaster the lower half, so scDis is kept.
    const portrait = 0;
    const isPortrait = this.camera.aspect < 1 ? 1 : 0;
    // The pistol is much shorter than the rifle; at the same size it looks big and close and blurs the lower half, so it gets its own notch
    const wScale = p.weapon === 'rifle' ? 1 : 0.86;
    // Portrait shrinks overall without touching the pose (changing the pose changes the shape, which is what to avoid).
    // Portrait shrinks overall without touching the pose (changing the pose changes the shape, which is what to avoid).
    // Pistol 0.65 (back to its pre-rework size); the rifle still read as too big, so it went down to 0.50.
    const scDis = isPortrait ? (p.weapon === 'rifle' ? 0.50 : 0.65) : 1;
    const sc = (0.56 + 0.44 * fit) * (1 - 0.22 * portrait) * wScale * scDis;
    const dolly = (1 + 0.3 * portrait) * (p.weapon === 'rifle' ? 1 : 1.12);
    // The rifle cannot be pushed further back in portrait: the farther it goes, the more pitch the solve needs to drop the muzzle
    // below the crosshair, standing it up like a pillar in the narrow frame. Portrait instead moves it slightly closer and lowers offY.
    // Same for the pistol, and portrait's dolly x1.3 pushes it too far, squashing the body in the narrow frame into
    // a thin strip -- so the portrait pistol is pulled back a notch as well, giving it enough size to show its side.
    const portRifleNear = portrait ? (p.weapon === 'rifle' ? 0.86 : 0.82) : 1;
    root.scale.setScalar(sc);

    const [rx0, ry0, rz0] = sights.rest;

    let x = rx0 * fit * (1 - 0.3 * portrait) + bobX * (1 - a);
    let y = ry0 * (1 - 0.08 * portrait) + bobY * (1 - a) - reloadDrop - this.switchT * 0.4;
    let z = rz0 * dolly * portRifleNear + this.recoil * 0.05 + this.switchT * 0.12;

    // Portrait is narrow and tall: with the desktop lower-right offset the pistol gets shoved into the corner,
    // leaving a big empty area on the left. The lateral bias is pulled in for portrait so the gun sits just right of centre.
    // The rifle is already centred in portrait and must not move, or the solve pushes it to odd angles.
    const xBias = (p.weapon === 'rifle' ? 0.032 : 0.026 * (1 - 0.72 * portrait)) * (1 - a);
    x += xBias;

    // ---- Gun pose: land the muzzle directly below the crosshair ----
    // Goal: put the muzzle anchor at offsetY directly below the crosshair (a little down the screen),
    // with the barrel axis running straight up through the crosshair -- muzzle below it on the same vertical line.
    // With ADS offsetY goes to 0 and the muzzle sits exactly on the crosshair, i.e. iron sights.
    // Under XYZ Euler order pitch and yaw are coupled and the asset's local axes are awkward to push by hand,
    // so this is solved directly in the real camera projection: write a candidate transform to root, read matrixWorld, project,
    // and use a 1D secant method to drive the muzzle's projected x to 0 and y to offsetY.
    const axis = root.userData.axis || { x: 0, y: 0.02, z: -0.6 };
    // Second point on the barrel axis: back from the muzzle along the body (positive = toward the rear).
    // Aligning only the muzzle is not enough -- that fixes just the position,
    // while the axis itself can be off (muzzle below, barrel splayed outward).
    // With this second point both must land on the crosshair's vertical line,
    // so the on-screen axis really does extend up through the crosshair.
    const axisSpan = p.weapon === 'rifle' ? 0.16 : 0.055;
    const kick = this.recoil * 0.14;
    // Extra pistol roll: the default grip has the slide facing up, leaving only a square tube in first person.
    // A little clockwise roll exposes the side profile (slide serrations, trigger guard, wooden grip panels).
    // Important: this roll must be about the barrel axis itself, not the root origin (rz),
    // or the axis swings away and the crosshair no longer lines up with the barrel.
    // Roll neither too much nor too little: too little shows only the slide's back face (a square bar),
    // too much and the gun faces the camera head-on with the grip flung to the lower right, as if aiming at the sky.
    // Negative sign: rolling negatively about the barrel axis lifts the **grip** (a positive sign pushed it down and right).
    // This is the only lossless way to raise the grip -- rotating about the axis does not move the axis,
    // so the barrel's extension still crosses the crosshair exactly (measured offset always 0px).
    // The magnitude is measured: at -0.30 the rifle grip rises another notch (magazine and grip fully visible),
    // the aspect ratio reaches about 0.5 and the AK lies fully flat; beyond -0.40 the stock lifts to the top right, too extreme, so do not go further.
    // The pistol went from 0.215 to 0.13: the grip is clearly higher and the slide side still shows;
    // below 0.115 the muzzle drifts noticeably right and looks unstable, so that is the floor.
    // [Raising the grip on screen]: do not tilt it with roll (roll tips the whole gun over),
    // instead **lift the whole gun** on screen -- bring the muzzle closer to the crosshair (smaller offY)
    // and widen the lateral distance (larger axisOffX), keeping the muzzle-to-crosshair distance roughly the same,
    // but moving the body up so the grip and stock no longer dangle in the lower right corner.
    // The barrel's extension still crosses the crosshair via the on-screen intersection solve, independent of offY.
    // Only a small roll is kept (rifle -0.055 / pistol 0.10): just enough to show a sliver of the upper side,
    // no longer responsible for raising the grip. At -0.16 the rifle visibly leaned left,
    // the user asked for it to be straightened; at -0.055 it measures essentially level while keeping a little side profile;
    // closer to 0 and it faces the rear of the gun, leaving only a narrow face.
    const rollZ = p.weapon === 'rifle'
      ? -0.055 * (1 - a)
      : 0.10 * (1 - a) * (1 - 0.22 * portrait);
    // There used to be a "shift the pistol left after rolling" compensation here; once the roll moved to the muzzle point,
    // the muzzle no longer moves and lateral alignment goes to the solve below, so no manual tweak here.
    const _p = new THREE.Vector3();
    // How far below the crosshair the muzzle sits while hip-firing, as a screen fraction (0.175 = 17.5% of a half-height); zero with ADS.
    // This value directly sets how high the grip sits on screen:
    //   the closer the muzzle to the crosshair (smaller offY), the steeper the solve must stand the gun, raising the pitch,
    //   dragging the grip down the screen and pointing the muzzle at the sky -- exactly the "pistol aiming at the sky" bug.
    //   Dropping the muzzle instead (larger offY) lays the body flat, raises the grip and levels the muzzle forward.
    // So the pistol needs a larger offY than intuition suggests (0.175), while the rifle is long and butt-supported at 0.135.
    // Portrait is narrow and tall and pushes the pistol away (dolly x1.3), so to land the muzzle below the crosshair
    // the solve can only stand the body steeper, becoming a vertical pillar with the muzzle tipped at the sky again.
    // So portrait needs the pistol's offY raised a notch more, flattening the body and lifting the grip.
    // Portrait compensation: narrow tall frame, pistol pushed away (dolly x1.3),
    // the same offY maps to a larger real drop on screen, so it is pulled back a notch.
    // Note this must shrink rather than grow -- the portrait pistol pitch is already near 0.6, and
    // lowering the muzzle further exceeds the range where the solver can bend the extension line back onto the crosshair (measured 115px off).
    const pistolOffYPortrait = 1 - 0.22 * portrait;
    // [Moving the muzzle away from the crosshair]: push this landing point lower (offY is the muzzle's screen landing height).
    // Not by pushing the whole gun away, which shrinks it into a toy. Sinking the muzzle
    // naturally opens up the gap to the crosshair.
    // At the baseline 0.135/0.175 the muzzle measured only 43px from the crosshair, too close.
    // Now at 0.115/0.135, with the on-screen intersection solve below, it is about 73-102px away,
    // while the body aspect stays at 0.40 (baseline 0.43), keeping the AK's flat composition.
    // Raising this value moves it farther and the solver will raise the pitch to follow --
    // but do not exceed 0.16: beyond that the body stretches into a sliver (measured W/H drops from 0.48 to 0.33),
    // and the portrait pistol hits the pitch ceiling and fails to solve.
    const offY = (p.weapon === 'rifle' ? 0.082 : 0.102 * pistolOffYPortrait) * (1 - a) * (p.weapon === 'rifle' && portrait ? 0.72 : 1);
    // Grip to the right: in an FPS the gun is not straight below the crosshair but angled down and right,
    // grip on the right of the frame and the slide's left face toward the camera. The only way to do that without breaking alignment is
    // rotating about the barrel axis -- at any angle the axis itself does not move, nor does the projection of its anchor points,
    // so the crosshair stays on the barrel's extension while the silhouette opens up to the right.
    // That opening to the right is the rollZ amount below (about the barrel axis at the muzzle,
    // not the root origin), and its size directly sets how far the grip swings right.
    // The anchor is always the muzzle (axis.z). ADS used to switch to axis.rear, moved back along the barrel axis,
    // and that branch was removed along with ADS.
    const anchorZ = axis.z;
    // Write (pos, rx, ry, rz) into root; roll is about the barrel axis itself (not the root origin),
    // so rolling never swings the axis off: any point on it stays on the same line.
    // Returns the projections (NDC) of the muzzle point and the rear axis point
    const _p2 = new THREE.Vector3();
    const _probe = new THREE.Vector3();
    const _probe2 = new THREE.Vector3();
    const _qa = new THREE.Quaternion();
    const _qx = new THREE.Quaternion();
    const _axs = new THREE.Vector3();
    const _ea = new THREE.Euler(0, 0, 0, 'XYZ');
    const _pivot = new THREE.Vector3();
    const _pivot2 = new THREE.Vector3();
    const _pivot3 = new THREE.Vector3();
    const _qInv = new THREE.Quaternion();
    const _off = new THREE.Vector3();
    const _qe = new THREE.Quaternion();
    const _qaFromEuler = (x, y, z) => _qe.setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
    // Barrel axis direction in model-local space (-Z points at the muzzle)
    const AXIS_Y = axis.y || 0;
    const applyPose = (px, py, pz, rx, ry, rz, roll) => {
      root.position.set(px, py, pz);
      root.rotation.set(rx, ry, rz);
      if (roll) {
        _ea.set(rx, ry, rz, 'XYZ');
        _qa.setFromEuler(_ea);
        _axs.set(0, 0, -1).applyQuaternion(_qa);
        _qx.setFromAxisAngle(_axs, roll);
        // Roll about the barrel axis through the muzzle point, not the one through the root origin.
        // The muzzle point is offset in y from the axis (axis.y), so rolling about the origin axis throws it out,
        // which shows up on screen as the whole gun shifting sideways and the barrel missing the crosshair.
        const px0 = axis.x || 0, py0 = AXIS_Y, pz0 = anchorZ;
        _pivot.set(px0, py0, pz0);
        _qa.premultiply(_qx);
        // At the new orientation the muzzle point moves to pivot'; pull pivot' back to where it was
        _pivot2.copy(_pivot).applyQuaternion(_qa);
        _pivot3.copy(_pivot).applyQuaternion(_qaFromEuler(rx, ry, rz));
        const dx = _pivot3.x - _pivot2.x, dy = _pivot3.y - _pivot2.y, dz = _pivot3.z - _pivot2.z;
        // Convert the amount the roll flung the muzzle out by into root-local space and cancel it,
        // so the roll acts as a rotation about the barrel axis through the muzzle -- the axis holds and the crosshair stays true.
        _qInv.copy(_qa).invert();
        _off.set(0, 0, 0);
        _off.set(dx, dy, dz).applyQuaternion(_qInv);
        root.quaternion.copy(_qa);
        root.position.add(_off);
      }
      root.updateMatrixWorld(true);
    };
    const project = (px, py, pz, rx, ry, rz, roll) => {
      applyPose(px, py, pz, rx, ry, rz, roll);
      _p.set(axis.x || 0, AXIS_Y, anchorZ).applyMatrix4(root.matrixWorld).project(this.wCam);
      return _p;
    };
    // Projection of the rear axis point (constrains the axis direction)
    const projectBack = (px, py, pz, rx, ry, rz, roll) => {
      applyPose(px, py, pz, rx, ry, rz, roll);
      _p2.set(axis.x || 0, AXIS_Y, anchorZ + axisSpan).applyMatrix4(root.matrixWorld).project(this.wCam);
      return _p2;
    };
    // 1D secant method for a monotonic f(t)=0
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
    // Alternating solve: rot.y horizontally (muzzle x to screen centre), rot.x vertically (to offsetY).
    // Presentation offsets (recoil / reload / bob) are included in the solve, so the solution is what is drawn.
    const mix = THREE.MathUtils.lerp(0.92, 1, a);
    // Final roll: the base roll plus the reload / bob / recoil presentation amounts.
    // The solve must use this final value, otherwise the computed alignment and the drawn pose differ
    // and the crosshair is always slightly off the barrel.
    const rollFinal = rollZ + reloadRoll * 0.5 + bobX * 0.7 * (1 - a) + this.recoil * 0.05;
    let pitchTo = 0.16, yawTo = 0;
    // Where the whole axis parks laterally, in screen NDC units.
    // 0 means the axis passes exactly through the crosshair centre -- the iron-sights/ADS meaning, which must hold exactly.
    // Hip-fire uses a small positive amount: muzzle and axis park right of the crosshair,
    // so the body opens down and right and you see the side of the AK / the pistol slide,
    // instead of a narrow strip facing the camera (which is where the aiming-at-the-sky look came from).
    // Key point: both axis anchors use the same axisOffX, so the axis stays exactly vertical,
    // the slope unchanged, only shifted as a whole -- not skewed, so skew never spikes.
    // Do not shrink this offset too hard in portrait.
    // It used to be (1 - 0.35*portrait), leaving 0.053 in portrait with the muzzle almost straight below the crosshair,
    // so the barrel could only stand vertical with the slide's back to the camera -- the pistol-pointing-at-the-sky bug.
    // Portrait now shrinks by 0.15 only, so the muzzle lands diagonally below-right and the body angles over to show its side.
    // axisOffX is NDC (-1..1 of frame width), not a physical distance.
    // At a portrait aspect of 0.46, the same 0.098 NDC is only 26% of the landscape lateral shift,
    // so the two constraints (extension line through the crosshair, muzzle offset sideways) pile up,
    // and the solver can only compensate by raising the pitch -- measured 0.111 -> 0.439, standing the pistol up like a pillar.
    // Fix: convert physically, scaling the NDC value in portrait to match landscape's real lateral shift.
    // (Landscape baseline aspect 1.78; capped at 2.6 so the offset cannot overflow an extremely narrow frame.)
    const offXPhys = this.camera.aspect < 1
      ? Math.min(3.2, 1.78 / Math.max(0.25, this.camera.aspect) * 0.62)
      : 1;
    const axisOffX = (p.weapon === 'rifle' ? 0.108 : 0.098) * (1 - a) * offXPhys;
    // Classic CS composition: the gun is not straight below the crosshair but angles up from the lower right toward the centre.
    // A fixed yawRest turns the body to the right about the vertical axis,
    // exposing its side (the AK's wooden handguard and magazine, the pistol's slide side),
    // with the muzzle landing naturally to the lower left. ADS must cancel this yaw (zero as a->1),
    // or the rear notch and front post do not share a sight line and the iron sights stop working.
    const yawRest = (p.weapon === 'rifle' ? 0.235 : 0.22) * (1 - a);
    // ---- Solve: muzzle landing point plus barrel extension through the crosshair ----
    //
    // Two constraints:
    //   (a) the muzzle projects to (axisOffX, -offY)  -- sets how high the gun sits and how far from the crosshair
    //   (b) the on-screen barrel line passes through the crosshair  -- the requested "extension through the crosshair"
    //
    // [Important] The criterion must be the on-screen intersection, not a 3D angle.
    //   They differ: a 3D angle carries a depth component that is invisible on screen.
    //   Driving the 3D angle to 0 needs a pitch of -0.10 (muzzle down),
    //   which flips the grip from lying flat to standing like a column and collapses the composition.
    //   Targeting the screen intersection instead lands the pitch in +0.10 to +0.23,
    //   with the intersection exact to 0.000 and a body aspect of 0.48 -> 0.35, still the flat CS composition.
    //
    // Method: pitch is one-dimensional and monotonic in the screen intersection, so the secant method solves it directly.
    //   Each trial sets the pose, then translates purely to park the muzzle at the target point
    //   (translation does not change orientation, so it cannot affect the intersection),
    //   then measures where the on-screen line from muzzle to rear axis point crosses the crosshair's vertical.
    //   Desktop, landscape and portrait all converge numerically here, with no hard-coded angles.
    const _ps = new THREE.Vector3();
    const _pb = new THREE.Vector3();
    const _pw = new THREE.Vector3();
    // Translate the muzzle purely to screen (wantX, wantY) without changing orientation
    const parkMuzzle = (wantX, wantY) => {
      for (let pass = 0; pass < 3; pass++) {
        let done = true;
        for (let k = 0; k < 2; k++) {
          const axn = k === 0 ? 'y' : 'x';
          const want = k === 0 ? wantY : wantX;
          for (let i = 0; i < 4; i++) {
            root.updateMatrixWorld(true);
            _probe.set(axis.x || 0, AXIS_Y, anchorZ).applyMatrix4(root.matrixWorld).project(this.wCam);
            const cur = axn === 'y' ? _probe.y : _probe.x;
            const d = cur - want;
            if (Math.abs(d) < 3e-6) break;
            done = false;
            const p0 = root.position[axn];
            root.position[axn] = p0 + 0.003;
            root.updateMatrixWorld(true);
            _probe2.set(axis.x || 0, AXIS_Y, anchorZ).applyMatrix4(root.matrixWorld).project(this.wCam);
            const kk = ((axn === 'y' ? _probe2.y : _probe2.x) - cur) / 0.003;
            root.position[axn] = p0;
            if (Math.abs(kk) < 1e-6) break;
            root.position[axn] = p0 - d / kk;
          }
        }
        if (done) break;
      }
    };
    // X coordinate where the on-screen extension meets the crosshair vertical (x=0); ideally 0.
    // Use two well-separated points on the barrel to define the line, avoiding blow-up when dy is near 0.
    const screenCross = (rx, ry, wantX, wantY) => {
      applyPose(x, y, z, rx, ry, 0, rollFinal);
      parkMuzzle(wantX, wantY);
      root.updateMatrixWorld(true);
      _ps.set(axis.x || 0, AXIS_Y, anchorZ).applyMatrix4(root.matrixWorld).project(this.wCam);
      // Rear axis point: step along local +Z (the muzzle is at -Z, so +Z points toward the receiver)
      const backLen = Math.max(0.30, axisSpan * 2);
      _pb.set(axis.x || 0, AXIS_Y, anchorZ + backLen).applyMatrix4(root.matrixWorld).project(this.wCam);
      const dy = _pb.y - _ps.y;
      if (Math.abs(dy) < 2e-3) return null;
      return _ps.x + (_pb.x - _ps.x) * (0 - _ps.y) / dy;
    };
    // [Key] parkMuzzle has the final say: it places the muzzle exactly at (wantX, wantY).
    // So any motion that should be visible (recoil, walk bob) must go into these two target values;
    // changing the pose and letting it produce a shift is useless -- the translation cancels it exactly.
    // Measured: adding kick to pitch alone moves the muzzle 0.0000; adding bob to the pose alone gives 0.00px peak-to-peak.
    const wantX = axisOffX + bobX * 0.16;
    // Recoil (kicking up) plus walk bob (a sense of breathing).
    // The 0.62 kick factor is measured: recoil=1 lifts the muzzle about 30px, close to how the weapon really feels.
    const wantY = (-offY + kick * 0.62 - bobY * 0.22 - reloadDrop) * mix;
    {
      // Initial value from the old 1D alternating iteration, which only lands the muzzle on the target
      for (let i = 0; i < 12; i++) {
        pitchTo = solve((t) => project(x, y, z, t * mix + kick + reloadRoll * 0.6,
          yawRest * mix + yawTo * mix + reloadRoll * 0.25, 0).y - wantY,
          pitchTo, -1.0, 1.0);
        const rx2 = pitchTo * mix + kick + reloadRoll * 0.6;
        const ry2 = yawRest * mix + yawTo * mix + reloadRoll * 0.25;
        const mx = project(x, y, z, rx2, ry2, 0).x - wantX;
        if (Math.abs(mx) > 5e-5) {
          const h = 0.004;
          const mx2 = project(x + h, y, z, rx2, ry2, 0).x - wantX;
          const kx = (mx2 - mx) / h;
          if (Math.abs(kx) > 1e-5) x -= mx / kx;
        }
        yawTo = solve((t) => {
          const rx = pitchTo * mix + kick + reloadRoll * 0.6;
          const ry = yawRest * mix + t * mix + reloadRoll * 0.25;
          return project(x, y, z, rx, ry, 0).x - wantX;
        }, yawTo, -0.5, 0.5);
      }
      // The screen intersection is monotonic in pitch, so solve it in one dimension.
      // Note this solves for the final pitch, presentation offsets included; translation is left to parkMuzzle.
      // The portrait pistol is solved with restraint: it is already near the pitch ceiling (about 0.6), and
      // lifting it further to align the extension stands the barrel fully upright with only the slide's back to the camera,
      // which is the reported "pistol pointing at the sky". The portrait pistol keeps 55% of the correction,
      // leaving about 12px of intersection error (on a 390px-wide frame), essentially invisible.
      const wA = (1 - a) * (portrait && p.weapon === 'pistol' ? 0.55 : 1);
      if (wA > 0.01) {
        let t0 = pitchTo * mix + kick + reloadRoll * 0.6;
        let f0 = screenCross(t0, yawRest * mix + yawTo * mix + reloadRoll * 0.25, wantX, wantY);
        // screenCross returns null when the barrel is nearly horizontal on screen (the intersection is unstable).
        // It triggers most easily at the instant of an aspect change: the pose is still the old one while the camera aspect has changed.
        // Retry from a few typical pitch values instead of giving up on the solve,
        // or the previous aspect's pose carries over (the muzzle ended up left of the crosshair after a rotation).
        if (f0 === null) {
          for (const tb of [0.15, 0.30, 0.05, 0.45, 0.60, -0.10]) {
            const fb = screenCross(tb, yawRest * mix + yawTo * mix + reloadRoll * 0.25, wantX, wantY);
            if (fb !== null) { t0 = tb; f0 = fb; break; }
          }
        }
        if (f0 !== null) {
          // Coarse scan to bracket the root, then bisect to converge.
          // Not straight secant: the root moves a lot with aspect and weapon
          // (desktop rifle ~0.15, portrait pistol ~0.55), and a secant from one point easily leaves the monotonic region.
          // A 0.02 step over +/-0.7rad covers every aspect combination.
          const ryS0 = yawRest * mix + yawTo * mix + reloadRoll * 0.25;
          const scanStep = 0.02, scanN = 35;
          const fAt = (t) => (t < -0.9 || t > 0.9) ? null : screenCross(t, ryS0, wantX, wantY);
          let lo = 0, hi = 0, flo = 0, found = false;
          let prevT = t0, prevF = f0;
          for (let k = 1; k <= scanN && !found; k++) {
            const t = t0 + k * scanStep;
            const f = fAt(t);
            if (f === null) continue;
            if (prevF * f <= 0) { lo = prevT; flo = prevF; hi = t; found = true; break; }
            prevT = t; prevF = f;
          }
          if (!found) {
            prevT = t0; prevF = f0;
            for (let k = 1; k <= scanN; k++) {
              const t = t0 - k * scanStep;
              const f = fAt(t);
              if (f === null) continue;
              if (prevF * f <= 0) { lo = t; flo = f; hi = prevT; found = true; break; }
              prevT = t; prevF = f;
            }
          }
          if (found) {
            for (let i = 0; i < 24; i++) {
              const mid = (lo + hi) * 0.5;
              const fm = screenCross(mid, ryS0, wantX, wantY);
              if (fm === null) break;
              if (Math.abs(fm) < 1e-5) { lo = hi = mid; flo = fm; break; }
              if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; }
            }
            const solved = (lo + hi) * 0.5;
            // Difference from the unsolved pitch, blended by (1-a) and added back to pitchTo
            pitchTo += (solved - (pitchTo * mix + kick + reloadRoll * 0.6)) / mix * wA;
          }
        }
      }
      // Finish: translate x to the solution at the final pose
      const rxS = pitchTo * mix + kick + reloadRoll * 0.6;
      const ryS = yawRest * mix + yawTo * mix + reloadRoll * 0.25;
      const mxS = project(x, y, z, rxS, ryS, 0).x - wantX;
      if (Math.abs(mxS) > 5e-5) {
        const h = 0.004;
        const mx2 = project(x + h, y, z, rxS, ryS, 0).x - wantX;
        const kx = (mx2 - mxS) / h;
        if (Math.abs(kx) > 1e-5) x -= mxS / kx;
      }
    }


    // Pose: compose the final values of the joint solve onto root.
    // Roll goes through the roll channel (about the barrel axis), never rotation.z,
    // which would knock the crosshair off the barrel.
    const rxFinal = pitchTo * mix + kick + reloadRoll * 0.6;
    const ryFinal = yawRest * mix + yawTo * mix + reloadRoll * 0.25;
    // Set the pose (roll included), then translate the muzzle purely to the target point.
    // Pure translation leaves the barrel's orientation alone, so constraint (b) survives,
    // while (a) the landing point is met exactly by parkMuzzle -- both hold at once.
    applyPose(x, y, z, rxFinal, ryFinal, 0, rollFinal);
    parkMuzzle(wantX, wantY);
    // [Portrait left shift] must happen after parkMuzzle.
    // parkMuzzle places the muzzle exactly at (wantX, wantY), so any attempt to move the final position
    // through wantX feeds back into screenCross (the measured pitch rose to 0.268).
    // The portrait frame is narrow, and the landscape-equivalent lateral offset hugs the right edge and crops the muzzle;
    // so after the whole solve, translate purely along the camera right vector without touching pose angles or alignment.
    if (this.camera.aspect < 1) {
      const k = Math.min(1, Math.max(0, (0.62 - this.camera.aspect) / 0.35));
      _p.setFromMatrixColumn(this.wCam.matrixWorld, 0);   // camera right vector
      root.position.addScaledVector(_p, (p.weapon === "rifle" ? -0.105 : -0.055) * k);
    }
    root.updateWorldMatrix(true, true);

    // ---- Other weapon: sink it fully out of frame ----
    // Both guns stay in wScene (see onWeaponChanged), but only one can be in frame at a time.
    // A plain visible toggle is atomic, so the switching frame looks like a gun appearing from nowhere,
    // worse when the frame rate stutters. Driving it by position makes the switch one lift and one sink, continuous throughout.
    //
    // Note the other gun does not go through applyPose, so its position is still last frame's,
    // so it must be computed **from scratch** here (from its rest position), never accumulated.
    {
      const otherIsPistol = p.weapon === 'rifle';
      const other = otherIsPistol ? this.pistolRoot : this.rifleRoot;
      const base = otherIsPistol ? [0.075, -0.125, -0.5] : [0.055, -0.125, -0.82];
      // The stowed gun **leaves the frame instantly, with no sink animation**: a 0.28s slide was tried,
      // but it crossed the visible area and players saw the other gun flash into view while switching.
      // Only the incoming gun gets the lift animation (switchT feeds wantY); the sink is instant.
      // Dropping 2.25 (wCam's vertical view at 0.8m is only about 0.83m) takes it fully out of frame,
      // and pushing back 0.4 stops the muzzle peeking in at the edge of very wide frames.
      other.position.set(base[0], base[1] - 2.25, base[2] + 0.4);
      other.visible = true;
    }


    // Muzzle flash: fast decay (core -> halo -> out), with the point light following
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
    // The world muzzle light follows the camera (about 0.6m in front of the player)
    if (this.muzzleLight.intensity > 0) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.muzzleLight.position.copy(this.camera.position).addScaledVector(dir, 0.7);
    }
  }

  /**
   * Aim assist (a touch-control quality-of-life feature)
   *
   * Requested behaviour: the player turns the view with a thumb, and when the screen-centre
   *       crosshair comes near an enemy the view "snaps" toward them. The crosshair itself
   *       never moves from screen centre; yaw/pitch (the facing) is what changes.
   *
   * Why it is built this way:
   *   · It does not touch the shot direction, only yaw/pitch -- firing still follows the view,
   *     so what the crosshair covers and what gets hit always agree, with no
   *     jarring kills where the crosshair was not on target.
   *   · It measures angular error rather than screen pixels: a perspective projection
   *     stretches at the edges, so a pixel threshold is far too wide there and too narrow
   *     in the centre. An angular threshold feels the same at any FOV and resolution.
   *   · Pull decays with angular error (tighter up close) and decays further while the
   *     player is actively turning -- otherwise it feels like it cannot be shaken off and steals control in a fight.
   *   · Only the single nearest target is pulled, avoiding jitter with two enemies in the middle.
   */
  updateAimAssist(dt, p) {
    const cfg = this.settings.aimAssist;
    this.aimTarget = null;
    if (!cfg || !cfg.on || p.dead) return;
    // No assist while reloading or switching, so the animation is not force-corrected
    if (p.reloading || this.switchT > 0) return;

    const eye = _aaEye.set(p.pos.x, p.eye, p.pos.z);
    // Current view direction
    _aaDir.set(0, 0, -1).applyEuler(_aaEuler.set(p.pitch, p.yaw, 0, 'YXZ'));

    const maxAng = cfg.maxAngle * Math.PI / 180;   // capture radius in radians
    // [Hysteresis] A target locked last frame gets a 1.35x wider effective radius.
    // Without it, an enemy moving near the maxAngle boundary enters and leaves on alternate frames,
    // and the pull switches on-off-on, which is one of the main sources of camera judder.
    const last = this._aaLast;
    const effMax = (e) => (e && e === last ? maxAng * 1.35 : maxAng);

    let bestE = null, bestAng = Infinity, bestHead = false;

    for (const e of this.enemies) {
      if (e.dead) continue;
      const k = e.group.scale.x;
      // Two candidate aim points: chest (large, forgiving) and head (small, only when very close)
      _aaV1.set(e.pos.x, e.pos.y + 1.24 * k, e.pos.z);          // chest
      _aaV2.set(e.pos.x, e.pos.y + 1.66 * k, e.pos.z);          // head
      _aaV1.sub(eye); _aaV2.sub(eye);
      const d1 = _aaV1.length(), d2 = _aaV2.length();
      if (d1 < 0.3 || d1 > 60 || d2 < 1e-4) continue;           // too close / too far, skip
      // Skip targets behind walls (pulling through a wall is baffling)
      // Note: length must be non-zero before normalize, or NaN poisons the whole assist
      _aaV1.normalize(); _aaV2.normalize();
      const lim = effMax(e);
      const a1 = Math.acos(Math.max(-1, Math.min(1, _aaV1.dot(_aaDir))));
      if (a1 > lim) continue;
      const hit = this.world.raycast(eye, _aaV1, d1);
      if (hit) continue;                                        // wall in the way

      const a2 = Math.acos(Math.max(-1, Math.min(1, _aaV2.dot(_aaDir))));
      // Head pull is stricter: only when the crosshair is already close to the head (lim * headRatio)
      let ang = a1, head = false;
      if (a2 < lim * cfg.headRatio) { ang = a2 * 0.5; head = true; }
      if (ang < bestAng) { bestAng = ang; bestE = e; bestHead = head; }
    }

    // [Fade in/out] The lock factor hold ramps smoothly from 0 to 1 (about 0.2s),
    // and back to 0 on losing the target (about 0.12s). Without it, every entry and
    // exit of the capture radius snapped the pull on and off and the view stuttered.
    if (bestE) {
      this._aaHold = Math.min(1, (this._aaHold || 0) + dt / 0.2);
      this._aaLast = bestE;
    } else {
      this._aaHold = Math.max(0, (this._aaHold || 0) - dt / 0.12);
      this._aaLast = null;
      return;   // no new dyaw after losing the target; residual pull fades with hold
    }
    // smoothstep so both ends of the fade are gentler
    const h = this._aaHold;
    const holdK = h * h * (3 - 2 * h);

    const k = bestE.group.scale.x;
    _aaTarget.set(bestE.pos.x, bestE.pos.y + (bestHead ? 1.66 : 1.24) * k, bestE.pos.z).sub(eye);
    const targetYaw = Math.atan2(-_aaTarget.x, -_aaTarget.z);
    const horiz = Math.hypot(_aaTarget.x, _aaTarget.z);
    const targetPitch = Math.atan2(_aaTarget.y, horiz);

    // Angular error (drives the pull strength)
    let dyaw = targetYaw - p.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    const dpitch = targetPitch - p.pitch;
    const dist = Math.hypot(dyaw, dpitch);

    // Pull strength: full at the centre, weaker toward the edge (quadratic, smoothly zero at the boundary)
    const t = Math.min(1, dist / maxAng);
    const edge = 1 - t * t;
    // Weaken the pull while the player is actively turning, so it never fights them
    const looking = Math.min(1, Math.hypot(this.input.lastLookDX || 0, this.input.lastLookDY || 0) / 6);
    // [Auto-fire damping] Pull drops to 30% for 0.25s after a shot, then recovers linearly.
    // Recoil kicks the view up and the assist pulls it back, two forces fighting on every bullet,
    // which made full-auto fire jitter at high frequency; yielding to recoil removes it.
    const fireT = this._aaFireT !== undefined ? performance.now() / 1000 - this._aaFireT : 99;
    const fireK = fireT < 0.25 ? 0.35 + 0.65 * (fireT / 0.25) : 1;

    const strength = cfg.strength * edge * (1 - 0.55 * looking) * holdK * fireK;

    // Smooth approach (exponential convergence); larger rate pulls faster
    const s = 1 - Math.exp(-cfg.rate * strength * dt);
    p.yaw += dyaw * s;
    const dp = dpitch * s;
    p.pitch += dp;
    // The assist's own downward correction counts as paying the recoil back, and its upward
    // correction as adding to it. Otherwise the pull moves the view off the burst anchor while
    // the recoil model still believes the anchor holds, and releasing the trigger would drag
    // the view back to a stale angle.
    if (p._recoilDebt > 0 && dp < 0) p._recoilDebt = Math.max(0, p._recoilDebt + dp);
    // Clamp back to the pitch limit
    const limP = Math.PI / 2 - 0.05;
    p.pitch = Math.max(-limP, Math.min(limP, p.pitch));

    this.aimTarget = bestE;
  }

  updateCamera(dt) {
    const p = this.player;
    const cam = this.camera;
    cam.rotation.y = p.yaw;
    cam.rotation.x = p.pitch;
    // Sway
    const hs = Math.hypot(p.vel.x, p.vel.z);
    const bob = Math.min(1, hs / 5.5) * 0.012;
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

    // Fixed FOV (no ADS, so no more adsK narrowing)
    const targetFov = window.innerHeight > window.innerWidth * 1.15 ? Math.min(105, this.settings.fov * 1.12) : this.settings.fov;
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 12);
      cam.updateProjectionMatrix();
    }
  }

  updateEffects(dt) {
    const camPos = this.camera.position;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.age += dt;
      // Advance by distance travelled rather than normalising age/life:
      // once life and endDist fall out of sync (speed tuned, stopShort added) normalisation leaves the streak
      // stuck near the origin (a past bug: the streak's x scale stayed at 0).
      // span = travel distance + streak length: the head arrives first, the tail catches up, then the whole thing dies.
      const dur = Math.max(0.03, t.span / t.speed);
      const head = Math.min(1, Math.max(0, t.age / dur));
      if (!Number.isFinite(head) || !t.dir || !t.from || !t.mesh) { this._dropTracer(i); continue; }
      if (t.age >= dur) { this._dropTracer(i); continue; }
      // Head position (never past the target) and tail position (trailing the head)
      const headD = Math.min(t.endDist, head * t.span);
      const tailD = Math.max(0, head * t.span - t.streak);
      this._layoutTracer(t, tailD, headD, camPos);
      // Brightness: brightest in flight, extinguished quickly on impact (not a constant fade, which looks like a stick slowly vanishing)
      const k = Math.max(0, (t.age - (t.endDist / t.speed) * 0.75) / Math.max(0.02, (dur - t.endDist / t.speed * 0.75)));
      // Then damp by distance to the camera: a streak right by the eye smears into a blob,
      // so it fades out fast within the last 1.5m (but not to invisibility, or players think the enemy never fired).
      const dc = t.mesh.position.distanceTo(camPos);
      const nearK = Math.min(1, Math.max(0, (dc - 0.6) / 1.6));
      t.mesh.material.opacity = Math.max(0, 1 - k) * (0.55 + 0.45 * nearK);
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
    // Muzzle flash: quads always face the camera (the fireball is not solid), while the barrel cone follows the trajectory.
    // The whole thing lasts 90ms, brightness decaying with t/life, brightest in the first half.
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.t -= dt;
      const k = Math.max(0, f.t / f.life);
      const grp = f.grp;
      const d = grp.userData.dir;
      const ball = grp.userData.ball;
      const cone = grp.userData.cone;
      const base = grp.userData.base || 0.6;
      if (ball) {
        ball.quaternion.copy(this.camera.quaternion);
        ball.scale.setScalar(base * (0.55 + (1 - k) * 0.75) * (0.7 + k * 0.5));
        ball.material.opacity = Math.min(1, k * 1.4);
      }
      if (cone) {
        // Cone: length along the trajectory, width perpendicular, offset slightly past the muzzle like ejected fire
        const toCam = new THREE.Vector3().subVectors(this.camera.position, grp.position).normalize();
        const upv = toCam.clone().addScaledVector(d, -toCam.dot(d));
        if (upv.lengthSq() < 1e-6) upv.set(0, 1, 0).addScaledVector(d, -d.y);
        upv.normalize();
        const side = new THREE.Vector3().crossVectors(d, upv).normalize();
        cone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, upv, side));
        const len = base * (1.1 + (1 - k) * 1.4);
        cone.scale.set(len, len * 0.42, 1);
        cone.position.copy(d).multiplyScalar(len * 0.40);
        cone.material.opacity = Math.min(1, k * 1.2) * 0.95;
      }
      if (f.light) f.light.intensity = 6 * k;
      if (f.t <= 0) {
        this.scene.remove(grp);
        grp.children.forEach((c) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        });
        this.flashes.splice(i, 1);
      }
    }
  }

  updateHUD(dt) {
    const p = this.player;
    this.hud.tick(dt);
    this.hud.updateVitals(p);
    // Crosshair spread
    const moving = Math.hypot(p.vel.x, p.vel.z) > 2.2;
    const def = p.def;
    let spread = moving ? def.spreadMoving : def.spread;
    if (p.crouch) spread *= 0.7;
    this.hud.setCrossSpread(spread);
    this.hud.el.cross.style.opacity = '1';
    // Crosshair enemy detection
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
      // A single bad frame must not kill the game loop
      if (!this._errLogged) { console.error('frame error:', err); this._errLogged = true; }
    }
  }

  step() {
    const rawDt = this.clock.getDelta();
    // Adaptive performance: drop render resolution when the frame rate stays low
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

      // Tell the recoil model whether the trigger is still down before it runs: while it is,
      // the climb holds; once released, the view settles back to where the burst began.
      p.recoilHold = this.input.firing;

      p.update(dt, this.input, this.world);

      // Aim assist must finish before firing, otherwise the frame the player pulls the trigger
      // still uses the pre-assist angle and it feels like the snap never happens.
      this.updateAimAssist(dt, p);

      // Auto / semi-auto fire (moved after update: fire only once the angle is settled,
      // so the muzzle direction matches where the crosshair points)
      if (this.input.firing) {
        if (p.def.auto || !this._wasFiring) p.tryFire();
      }
      this._wasFiring = this.input.firing;

      // Wave spawning / advance
      this.updateWaves(dt);

      for (const e of this.enemies) e.update(dt, p, this.world);

      // Timer
      this.timeLeft -= dt;
      this.hud.updateTimer(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame(false);
      }
      this.updateHUD(dt);
      // Clean up enemies that have been dead a while
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.dead && e.deathT > 6) { e.dispose(); this.enemies.splice(i, 1); }
      }
    } else if (this.state === 'menu') {
      // Menu background: slow orbit
      this._menuT = (this._menuT || 0) + dt;
      const t = this._menuT * 0.1;
      const cam = this.camera;
      // Orbit slowly around the arena centre, looking slightly down over the field
      cam.position.set(Math.sin(t) * 13, 3.4 + Math.sin(t * 0.6) * 0.5, Math.cos(t) * 13);
      cam.lookAt(0, 1.2, 0);
      cam.rotation.z = 0;
    }

    if (this.state === 'playing' || this.state === 'paused') {
      this.updateCamera(dt);
      this.updateWeaponView(dt);
      this.updateEffects(dt);
      // Main scene
      this.renderer.render(this.scene, this.camera);
      // Draw the weapon while paused too: wScene used to render only in the playing branch, so
      // pressing Esc made the gun vanish entirely and snap back on resume.
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.wScene, this.wCam);
      this.renderer.autoClear = true;
    } else if (this.state === 'menu') {
      this.updateEffects(dt);
      this.renderer.render(this.scene, this.camera);
    } else {
      // The end state still renders the final frame
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
