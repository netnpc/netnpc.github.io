// 玩家 / 敌人 / 武器 / 回合逻辑
import * as THREE from '../vendor/three.module.min.js';
import { buildRifle, buildPistol, buildSoldier, flashTexture } from './assets.js';
import { rayCapsule, ARENA } from './world.js';

export const WEAPONS = {
  rifle: {
    id: 'rifle', name: 'AK-47', magSize: 30, reserveMax: 240, rpm: 600, dmg: 33, headMul: 3.2,
    spread: 0.010, spreadMoving: 0.035, spreadAds: 0.004, recoil: 0.011, recoilMax: 0.075,
    reloadTime: 2.0, auto: true, range: 90, falloff: 0.62, kick: 0.035,
  },
  pistol: {
    id: 'pistol', name: 'DESERT EAGLE .50', magSize: 7, reserveMax: 56, rpm: 210, dmg: 54, headMul: 3.0,
    spread: 0.010, spreadMoving: 0.034, spreadAds: 0.004, recoil: 0.03, recoilMax: 0.12,
    reloadTime: 1.7, auto: false, range: 80, falloff: 0.7, kick: 0.07,
  },
};

const EYE = 1.62;
const CROUCH_EYE = 1.15;
const PLAYER_R = 0.38;

// ---------------- 玩家 ----------------
export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 0, 17);
    this.vel = new THREE.Vector3();
    this.yaw = 0;  // yaw=0 时面向 -Z（场地中心）
    this.pitch = 0;
    this.hp = 100;
    this.armor = 100;
    this.onGround = true;
    this.crouch = false;
    this.eyeH = EYE;
    this.bobT = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.weapon = 'rifle';
    this.ammo = { rifle: { mag: 30, reserve: 150 }, pistol: { mag: 7, reserve: 28 } };
    this.reloading = false;
    this.reloadT = 0;
    this.fireCd = 0;
    this.stats = { kills: 0, heads: 0, shots: 0, hits: 0, score: 0 };
    this.dead = false;
    this.landT = 0;
  }

  reset() {
    const w = this.game.world;
    const sp = w && w.spawn ? w.spawn : new THREE.Vector3(0, 0, 17);
    this.pos.set(sp.x, 0, sp.z);
    this.vel.set(0, 0, 0);
    this.yaw = (w && w.spawnYaw) || 0;
    this.pitch = 0;
    this.hp = 100; this.armor = 100;
    this.weapon = 'rifle';
    this.ammo = { rifle: { mag: 30, reserve: 150 }, pistol: { mag: 7, reserve: 28 } };
    this.reloading = false; this.reloadT = 0; this.fireCd = 0;
    this.recoilPitch = 0; this.recoilYaw = 0;
    this.stats = { kills: 0, heads: 0, shots: 0, hits: 0, score: 0 };
    this.dead = false;
    this.crouch = false;
  }

  get def() { return WEAPONS[this.weapon]; }
  get eye() { return this.pos.y + this.eyeH; }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch -= dy;
    const lim = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  update(dt, input, world) {
    if (this.dead) return;

    // 视角
    const lk = input.consumeLook();
    this.look(lk.dx, lk.dy);

    // 后坐力恢复
    const rec = Math.min(1, dt * 7);
    this.yaw += this.recoilYaw * rec;
    this.pitch += this.recoilPitch * rec;
    this.recoilYaw *= (1 - rec);
    this.recoilPitch *= (1 - rec);

    // 蹲
    this.crouch = input.wantCrouch;
    const targetEye = this.crouch ? CROUCH_EYE : EYE;
    this.eyeH += (targetEye - this.eyeH) * Math.min(1, dt * 12);

    // 移动
    const ax = input.axis();
    const sprint = input.sprinting && ax.y > 0.1 && !this.crouch;
    // 移动速度：提升步行/冲刺速度并加快起步响应，手感更利落
    let speed = this.crouch ? 2.9 : sprint ? 10.4 : 6.8;
    if (this.reloading) speed *= 0.92;
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    // 前方向 (-sin, -cos)，右方向 (cos, -sin)
    const wishX = (-sinY * ax.y + cosY * ax.x) * speed;
    const wishZ = (-cosY * ax.y - sinY * ax.x) * speed;
    const accel = this.onGround ? 22 : 4.2;
    this.vel.x += (wishX - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wishZ - this.vel.z) * Math.min(1, accel * dt);

    // 跳跃
    if (input.wantJump) {
      input.wantJump = false;
      if (this.onGround) {
        this.vel.y = 6.4;
        this.onGround = false;
        this.game.sfx.jump();
      }
    }
    this.vel.y -= 20 * dt;

    // 水平移动 + 碰撞
    const prevY = this.pos.y;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    world.resolve(this.pos, PLAYER_R, this.crouch ? 1.2 : 1.75);

    // 垂直
    this.pos.y += this.vel.y * dt;
    const gh = world.groundHeight(this.pos.x, this.pos.z, PLAYER_R, this.pos.y);
    if (this.pos.y <= gh + 1e-4) {
      if (!this.onGround && this.vel.y < -5) {
        this.game.sfx.step();
        this.game.shake(Math.min(0.06, -this.vel.y * 0.006));
      }
      this.pos.y = gh;
      this.vel.y = 0;
      this.onGround = true;
    } else {
      // 头顶碰撞：简单检测，若在盒子下方则阻挡
      this.onGround = this.pos.y - gh < 0.06;
    }
    // 防止穿过地面
    if (this.pos.y < 0) { this.pos.y = 0; this.vel.y = 0; this.onGround = true; }

    // 脚步声 & 晃动（步频按实际位移走，速度提升后自动变快；晃动系数略降避免抖）
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 1.2) {
      this.bobT += dt * hs * 1.22;
      this._stepT = (this._stepT || 0) + dt * hs;
      const stepInt = sprint ? 2.6 : 3.4;
      if (this._stepT > stepInt) { this._stepT = 0; this.game.sfx.step(); }
    } else {
      this.bobT += dt * 1.2;
    }

    // 换弹
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }

    // 切枪
    if (input.consumeFlag('wantSwitch')) {
      this.switchWeapon(this.weapon === 'rifle' ? 'pistol' : 'rifle');
    }
    if (input.consumeFlag('wantReload')) this.startReload();
  }

  switchWeapon(w) {
    if (w === this.weapon || this.dead) return;
    this.weapon = w;
    this.reloading = false;
    this.reloadT = 0;
    this.game.onWeaponChanged(w);
  }

  startReload() {
    const a = this.ammo[this.weapon];
    if (this.reloading || this.dead) return;
    if (a.mag >= this.def.magSize || a.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = this.def.reloadTime;
    this.game.sfx.reload();
    this.game.hud.setReloading(true, this.def.reloadTime);
  }

  finishReload() {
    const a = this.ammo[this.weapon];
    const need = this.def.magSize - a.mag;
    const take = Math.min(need, a.reserve);
    a.mag += take;
    a.reserve -= take;
    this.reloading = false;
    this.game.hud.setReloading(false);
    this.game.hud.updateAmmo(this);
  }

  tryFire() {
    if (this.dead) return false;
    if (this.reloading) return false;
    const a = this.ammo[this.weapon];
    if (this.fireCd > 0) return false;
    if (a.mag <= 0) {
      if (this.fireCd <= 0) {
        this.game.sfx.empty();
        this.fireCd = 0.25;
        this.game.hud.flashReloadHint();
        if (a.reserve > 0) this.startReload();
      }
      return false;
    }
    a.mag--;
    this.fireCd = 60 / this.def.rpm;
    this.stats.shots++;
    this.game.onPlayerShot();
    return true;
  }

  hurt(dmg) {
    if (this.dead) return;
    let d = dmg;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, d * 0.5);
      this.armor -= absorbed;
      d -= absorbed;
    }
    this.hp -= d;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.game.onPlayerDeath();
    }
  }
}

// ---------------- 敌人 ----------------
export class Enemy {
  constructor(game, pos, tier = 0) {
    this.game = game;
    this.pos = pos.clone();
    this.spawnPos = pos.clone();
    this.yaw = Math.atan2(-(0 - pos.x), -(0 - pos.z));
    this.tier = tier;
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.dead = false;
    this.deathT = 0;
    this.radius = 0.36;
    this.height = 1.78;
    this.state = 'idle';
    this.fireCd = 1 + Math.random();
    this.reactionT = 0;
    this.seesPlayer = false;
    this.lastSeen = new THREE.Vector3();
    this.hasLastSeen = false;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.moveGoal = null;
    this.repathT = 0;
    this.hitFlash = 0;
    this.walkT = Math.random() * 6;
    this.speed = 2.6 + Math.random() * 0.5;
    this.aimT = 0;
    this.aiming = false;
    this.muzzleT = 0;
    this._bob = 0;

    // 分层外观：0 普通（红棕）/ 1 老兵（深蓝）/ 2 精英（黑+红外骨骼镜）
    const looks = [
      { color: 0x7a5c34, skin: 0xd0a07a, opt: { cap: true } },                       // 沙棕迷彩 + 巡逻帽
      { color: 0x2e3a4a, skin: 0xc99a70, opt: { vet: true } },                          // 深蓝灰迷彩（Urban）
      { color: 0x26282c, skin: 0xb98a66, opt: { elite: true, visorColor: 0xff2a10 } }, // 黑装 + 红镜（GSG9）
    ];
    const lk = looks[Math.min(tier, looks.length - 1)];
    this.group = buildSoldier(lk.color, lk.skin, lk.opt);
    this.group.position.copy(this.pos);
    this.group.userData.baseY = 0;
    game.scene.add(this.group);
    const ud = this.group.userData;
    this.headMesh = ud.head;
    this.body = ud.body;
    this.legL = ud.legL;
    this.legR = ud.legR;
    this.armL = ud.armL;
    this.armR = ud.armR;
    this.vest = ud.vest;
    this.flashMats = ud.flashMats;
    this.gun = ud.gun;
    this.gunBase = { y: this.gun.position.y, rx: this.gun.rotation.x };
    // 整体放大（原来偏小，远看像小人）；精英再大一圈
    const scl = tier === 2 ? 1.2 : tier === 1 ? 1.13 : 1.16;
    this.group.scale.setScalar(scl);
    // 碰撞体同步放大
    this.radius = 0.36 * scl;
    this.height = 1.78 * scl;
  }

  get eyePos() { const k = this.group ? this.group.scale.x : 1; return new THREE.Vector3(this.pos.x, this.pos.y + 1.62 * k, this.pos.z); }

  dispose() {
    this.game.scene.remove(this.group);
    this.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } });
  }

  // 射线命中（从上到下优先头部）
  rayHit(origin, dir, maxDist) {
    if (this.dead) return null;
    // 头部球（按实际缩放同步，放大后仍要"打得中")
    const k = this.group.scale.x;
    const headC = new THREE.Vector3(this.pos.x, this.pos.y + 1.66 * k, this.pos.z);
    const ht = raySphere(origin, dir, headC, 0.16 * k);
    // 身体胶囊
    const bt = rayCapsule(origin, dir, this.pos, this.radius + 0.05, 1.5 * k);
    let best = null;
    if (ht !== null && ht <= maxDist) best = { dist: ht, head: true };
    if (bt !== null && bt <= maxDist && (!best || bt < best.dist)) best = { dist: bt, head: false };
    return best;
  }

  hurt(dmg, head, fromPos) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.hitFlash = 0.12;
    // 被击中后警觉
    if (!this.seesPlayer) {
      this.reactionT = 0.18;
      this.state = 'alert';
      this.lastSeen.copy(fromPos); this.hasLastSeen = true;
      this.yaw = Math.atan2(-(fromPos.x - this.pos.x), -(fromPos.z - this.pos.z));
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.dead = true;
    this.deathT = 0;
    this.state = 'dead';
  }

  update(dt, player, world) {
    if (this.dead) {
      this.deathT += dt;
      const k = Math.min(1, this.deathT / 0.55);
      const e = easeOut(k);
      this.body.rotation.x = -Math.PI / 2 * e;
      this.body.position.y = -0.1 * e;
      this.body.rotation.z = 0.12 * e;
      this.group.position.y = this.pos.y - 0.15 * e;
      // 手臂自然松开
      if (this.armL) this.armL.rotation.z = 0.5 * e;
      if (this.armR) this.armR.rotation.z = -0.5 * e;
      return;
    }
    // 命中闪白
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const f = this.hitFlash > 0 ? 0.7 : 0;
      for (const m of this.flashMats) m.emissive.setRGB(f, 0, 0);
    } else if (this.flashMats[0].emissive.r > 0) {
      for (const m of this.flashMats) m.emissive.setRGB(0, 0, 0);
    }

    const toPlayer = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z);
    const dist = toPlayer.length();
    const targetYaw = Math.atan2(-toPlayer.x, -toPlayer.z);

    // 视线检测
    const eye = this.eyePos;
    const target = new THREE.Vector3(player.pos.x, player.pos.y + player.eyeH * 0.92, player.pos.z);
    const dirToP = target.clone().sub(eye);
    const dLen = dirToP.length();
    dirToP.normalize();
    const wallHit = world.raycast(eye, dirToP, dLen - 0.25);
    // 同伴阻挡不算遮挡
    const canSee = !wallHit && !player.dead;
    const fovOk = dist < 26;
    this.seesPlayer = canSee && fovOk;

    if (this.seesPlayer) {
      this.lastSeen.copy(player.pos);
      this.hasLastSeen = true;
      if (this.state !== 'attack') {
        this.reactionT -= dt;
        if (this.reactionT <= 0) this.state = 'attack';
      }
      this.state = 'attack';
    } else if (this.state === 'attack') {
      this.state = 'search';
      this.searchT = 1.6;
    }

    // 朝向
    let desiredYaw = this.yaw;
    if (this.seesPlayer) desiredYaw = targetYaw;
    else if (this.state === 'search' && this.hasLastSeen) {
      desiredYaw = Math.atan2(-(this.lastSeen.x - this.pos.x), -(this.lastSeen.z - this.pos.z));
    } else if (this.moveGoal) {
      desiredYaw = Math.atan2(-(this.moveGoal.x - this.pos.x), -(this.moveGoal.z - this.pos.z));
    }
    let dY = ((desiredYaw - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.yaw += dY * Math.min(1, dt * 7);

    // 移动策略
    let mvX = 0, mvZ = 0;
    this.walkT += dt * 4;
    if (this.state === 'attack') {
      this.repathT -= dt;
      if (dist > 12) {
        // 靠近
        mvX = toPlayer.x / dist; mvZ = toPlayer.z / dist;
      } else if (dist < 5) {
        // 后退保持距离
        mvX = -toPlayer.x / dist * 0.7; mvZ = -toPlayer.z / dist * 0.7;
      }
      // 侧移
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = 1.2 + Math.random() * 1.4; this.strafeDir *= -1; }
      const sx = -toPlayer.z / (dist || 1), sz = toPlayer.x / (dist || 1);
      mvX += sx * this.strafeDir * 0.85;
      mvZ += sz * this.strafeDir * 0.85;
    } else if (this.state === 'search') {
      this.searchT -= dt;
      // 向玩家最后位置移动
      if (this.hasLastSeen) {
        const d2 = new THREE.Vector2(this.lastSeen.x - this.pos.x, this.lastSeen.z - this.pos.z);
        const l = d2.length();
        if (l > 1.2) { mvX = d2.x / l; mvZ = d2.y / l; }
      }
      if (this.searchT <= 0) this.state = 'idle';
    } else {
      // 巡逻：随机点
      this.repathT -= dt;
      if (!this.moveGoal || this.repathT <= 0 || this.pos.distanceTo(this.moveGoal) < 1.5) {
        this.moveGoal = randomPatrolPoint(this.pos, player.pos);
        this.repathT = 6 + Math.random() * 4;
      }
      if (this.moveGoal) {
        const dx = this.moveGoal.x - this.pos.x, dz = this.moveGoal.z - this.pos.z;
        const l = Math.hypot(dx, dz) || 1;
        mvX = dx / l; mvZ = dz / l;
      }
    }

    const ml = Math.hypot(mvX, mvZ);
    if (ml > 0.01) {
      const sp = this.speed * (this.state === 'attack' ? 0.95 : 1);
      const nx = this.pos.x + (mvX / ml) * sp * dt;
      const nz = this.pos.z + (mvZ / ml) * sp * dt;
      const test = new THREE.Vector3(nx, this.pos.y, nz);
      const before = test.clone();
      world.resolve(test, this.radius, this.height);
      // 若被卡住则换个方向
      if (test.distanceTo(before) > 0.002 && this.state === 'idle') this.repathT = 0;
      this.pos.x = test.x; this.pos.z = test.z;
      // 避免重叠
      for (const e of this.game.enemies) {
        if (e === this || e.dead) continue;
        const dx = this.pos.x - e.pos.x, dz = this.pos.z - e.pos.z;
        const d = Math.hypot(dx, dz);
        const minD = this.radius + e.radius + 0.15;
        if (d > 0.001 && d < minD) {
          this.pos.x += (dx / d) * (minD - d) * 0.5;
          this.pos.z += (dz / d) * (minD - d) * 0.5;
        }
      }
      // 步态：腿前后摆，上身反向微扭，身体上下起伏
      const ph = Math.sin(this.walkT);
      const sw = ph * 0.55;
      this.legL.rotation.x = sw;
      this.legR.rotation.x = -sw;
      if (this.armL) this.armL.rotation.x = -sw * 0.35;
      if (this.armR) this.armR.rotation.x = sw * 0.2;
      this.body.rotation.y = ph * 0.06;
      this._bob = Math.abs(Math.cos(this.walkT)) * 0.035;
      this.body.position.y = this._bob;
    } else {
      const k = Math.min(1, dt * 8);
      this.legL.rotation.x *= (1 - k);
      this.legR.rotation.x *= (1 - k);
      if (this.armL) this.armL.rotation.x *= (1 - k);
      if (this.armR) this.armR.rotation.x *= (1 - k);
      this.body.rotation.y *= (1 - k);
      this.body.position.y += (0 - this.body.position.y) * k;
      // 待机微呼吸
      this.walkT += dt * 1.6;
      this.body.position.y += Math.sin(this.walkT) * 0.004;
    }

    // 地面
    this.pos.y = world.groundHeight(this.pos.x, this.pos.z, this.radius, 2);

    // 开火
    if (this.state === 'attack' && this.seesPlayer) {
      this.fireCd -= dt;
      // 抬枪瞄准：枪管真实指向玩家（子弹从枪口射向玩家，视觉一致）
      this.aimT = Math.min(1, this.aimT + dt * 6);
      this.aimGun(player, this.aimT);
      if (this.fireCd <= 0 && !player.dead) {
        const rate = this.tier === 2 ? 1.0 : this.tier === 1 ? 0.62 : 0.85;
        this.fireCd = rate * (0.85 + Math.random() * 0.5);
        this.shootAt(player, dist);
        // 枪口上跳
        this.gun.position.y += 0.012;
      }
    } else {
      this.aimT = Math.max(0, this.aimT - dt * 4);
      this.aimGun(player, this.aimT);
      this.fireCd = Math.max(this.fireCd - dt, 0.25 + Math.random() * 0.4);
    }

    // 应用
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
  }

  // 把枪管对准玩家：k=0..1 在待机姿态与瞄准姿态之间插值。
  // 之前只俯仰枪身、方向仍跟着身体走，玩家在侧面时子弹与枪管明显分叉；
  // 现在直接把枪管 -Z 轴用四元数对到"枪口→玩家"方向，指哪打哪。
  aimGun(player, k) {
    const g = this.gun;
    if (!g) return;
    k = Math.max(0, Math.min(1, k));
    this.group.updateMatrixWorld(true);
    const gp = new THREE.Vector3();
    g.getWorldPosition(gp);
    const dirP = new THREE.Vector3(player.pos.x, player.pos.y + 1.15, player.pos.z)
      .sub(gp).normalize();
    const qAim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dirP);
    const pq = new THREE.Quaternion();
    g.parent.getWorldQuaternion(pq);
    const qLocal = pq.invert().multiply(qAim);
    const qRest = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.gunBase.rx, 0, 0));
    g.quaternion.copy(qRest.slerp(qLocal, k));
    g.position.y = this.gunBase.y + 0.06 * k;
  }

  shootAt(player, dist) {
    const g = this.game;
    const accuracy = this.tier === 2 ? 0.86 : this.tier === 1 ? 0.72 : 0.58;
    const distFactor = Math.max(0.35, 1 - dist / 42);
    const hitChance = accuracy * distFactor;
    // 先把枪管完全对准玩家再取枪口世界坐标，
    // 保证弹道起点、方向与枪管视觉朝向完全一致
    this.aimGun(player, 1);
    const muzzle = new THREE.Vector3();
    if (this.gun) {
      this.group.updateMatrixWorld(true);
      const ml = this.gun.userData.muzzle;
      muzzle.copy(ml ? ml : new THREE.Vector3(0, 0.012, -0.62));
      this.gun.localToWorld(muzzle);
    } else {
      muzzle.copy(this.eyePos).add(new THREE.Vector3(-Math.sin(this.yaw) * 0.55, -0.3, -Math.cos(this.yaw) * 0.55));
    }
    const targetHead = new THREE.Vector3(player.pos.x, player.pos.y + (Math.random() < 0.22 ? player.eyeH : 1.05), player.pos.z);
    const dir = targetHead.clone().sub(muzzle).normalize();
    const hit = Math.random() < hitChance;
    const spread = hit ? 0.014 : 0.16;
    dir.x += (Math.random() - 0.5) * spread * 2;
    dir.y += (Math.random() - 0.5) * spread * 2;
    dir.z += (Math.random() - 0.5) * spread * 2;
    dir.normalize();

    let endPoint = null, endDist = 60;
    const wall = g.world.raycast(muzzle, dir, 60);
    if (wall) { endDist = wall.dist; endPoint = wall.point; }
    if (hit) {
      const pDist = muzzle.distanceTo(targetHead);
      if (pDist < endDist) {
        g.onPlayerHit(Math.round(this.tier === 2 ? 15 : this.tier === 1 ? 12 : 9), muzzle);
        endDist = pDist;
        endPoint = targetHead;
      }
    }
    g.tracer(muzzle, endPoint || muzzle.clone().addScaledVector(dir, endDist), 0xffb060);
    g.sfx.enemyShot(dist);
    if (Math.random() < 0.55) {
      g.spawnImpact(endPoint || muzzle.clone().addScaledVector(dir, endDist), 0x8a7a5a);
    }
    g.alertShot(muzzle);
  }
}

function raySphere(o, d, c, r) {
  const oc = new THREE.Vector3().subVectors(o, c);
  const b = oc.dot(d);
  const cc = oc.dot(oc) - r * r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t1 = -b - sq, t2 = -b + sq;
  if (t2 < 0) return null;
  return t1 >= 0 ? t1 : 0;
}

function easeOut(k) { return 1 - Math.pow(1 - k, 3); }

function randomPatrolPoint(from, playerPos) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 16;
    const x = from.x + Math.cos(a) * r;
    const z = from.z + Math.sin(a) * r;
    if (x < ARENA.minX + 3 || x > ARENA.maxX - 3 || z < ARENA.minZ + 3 || z > ARENA.maxZ - 3) continue;
    return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(Math.random() * 30 - 15, 0, Math.random() * 30 - 15);
}
// ---------------- 敌人生成点（由当前地图提供，见 world.js MAPS[].spawns） ----------------
// 保留导出以兼容旧引用；实际运行时使用 game.world.spawns
export const SPAWNS = [];
