// Player / enemy / weapon / round logic
import * as THREE from '../vendor/three.module.min.js?v=20261105041531';
import { buildRifle, buildPistol, buildSoldier, flashTexture } from './assets.js?v=20261105041531';
import { rayCapsule, ARENA } from './world.js?v=20261105041531';

export const WEAPONS = {
  rifle: {
    id: 'rifle', name: 'AK-47', magSize: 30, reserveMax: 240, rpm: 600, dmg: 33, headMul: 3.2,
    spread: 0.010, spreadMoving: 0.035, recoil: 0.011, recoilMax: 0.030,
    reloadTime: 2.0, auto: true, range: 90, falloff: 0.62, kick: 0.035,
  },
  pistol: {
    id: 'pistol', name: 'DESERT EAGLE .50', magSize: 7, reserveMax: 56, rpm: 210, dmg: 54, headMul: 3.0,
    spread: 0.010, spreadMoving: 0.034, recoil: 0.03, recoilMax: 0.055,
    reloadTime: 1.7, auto: false, range: 80, falloff: 0.7, kick: 0.07,
  },
};

const EYE = 1.62;
const CROUCH_EYE = 1.15;
const PLAYER_R = 0.38;

// ---------------- Player ----------------
export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 0, 17);
    this.vel = new THREE.Vector3();
    this.yaw = 0;  // yaw=0 faces -Z (the centre of the arena)
    this.pitch = 0;
    this.hp = 100;
    this.armor = 100;
    this.onGround = true;
    this.crouch = false;
    this.eyeH = EYE;
    this.bobT = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.recoilHold = false;   // set by main.js while the trigger is down
    // Where the view sat before the current burst started, and how much of the burst has not
    // been paid back yet. The assist pulls the view back to that anchor instead of letting
    // every shot ratchet it upward (see climbRecoil / the recovery block in update).
    this._recoilAnchor = 0;
    this._recoilDebt = 0;
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
    // Keep the weapon held at the end of the last round: finish with the pistol and the next round starts with it.
    // (This was hard-coded to 'rifle', so a new round started on the rifle while the player thought they held the pistol.)
    if (this.weapon !== 'rifle' && this.weapon !== 'pistol') this.weapon = 'rifle';
    this.ammo = { rifle: { mag: 30, reserve: 150 }, pistol: { mag: 7, reserve: 28 } };
    this.reloading = false; this.reloadT = 0; this.fireCd = 0;
    this.recoilPitch = 0; this.recoilYaw = 0;
    this._recoilAnchor = this.pitch; this._recoilDebt = 0;
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
    // Only the player's own downward drag clears recoil debt. Pitch alone cannot tell them
    // apart: the climb itself raises pitch past the anchor, and reading that as "already
    // pulled down" cancelled every shot's debt the frame it was booked.
    if (dy > 0 && this._recoilDebt > 0) {
      this._recoilDebt = Math.max(0, this._recoilDebt - dy);
    }
  }

  /**
   * One shot's worth of muzzle climb.
   *
   * A burst only nudges the view up and then straight back down; the crosshair must end a
   * burst exactly where it started. Adding a permanent offset per shot cannot do that -- at
   * 600rpm the offset arrives ten times a second while recovery drains it at a fixed rate,
   * so sustained fire climbed without limit (about 0.9 deg/s, 17 deg over one magazine) and
   * recovering the aim meant dragging the thumb down after every burst.
   *
   * So the climb is booked as debt against the pitch the burst started from. The view kicks
   * up immediately -- that is the felt recoil -- and the debt is then paid back so the view
   * returns to the anchor. recoilMax caps the total climb within one burst, so a long burst
   * does not walk the crosshair up the screen.
   */
  climbRecoil(kick) {
    if (this._recoilDebt <= 1e-5) this._recoilAnchor = this.pitch;
    const room = Math.max(0, this.def.recoilMax - this._recoilDebt);
    const add = Math.min(kick, room);
    if (add <= 0) return;
    this.pitch += add;
    this._recoilDebt += add;
    this.recoilPitch += add;      // drives the barrel kick, purely visual
    this._recoilIdle = 0;
  }

  /**
   * Give the climb back. Runs once per frame from update().
   *
   * While the trigger is down the view holds its climb -- that is the recoil the player feels.
   * Once the trigger has been released for a moment the remaining climb is returned
   * proportionally, so the crosshair lands back exactly where the burst began. Dragging down
   * pays it off early (see look()), because then the player is re-aiming and the animation
   * must not fight them.
   */
  _settleRecoil(dt, firing) {
    if (this._recoilDebt <= 0) return;
    const idle = firing ? 0 : (this._recoilIdle || 0) + dt;
    this._recoilIdle = idle;
    // While the trigger is down the view holds its climb: that is the recoil the player feels.
    // Once it is released the remaining climb is returned proportionally, so the crosshair
    // lands back where the burst began. The debt is capped by recoilMax, so this is bounded.
    if (idle > 0.06) {
      const pay = this._recoilDebt * Math.min(1, dt * 16);
      this.pitch -= pay;
      this._recoilDebt -= pay;
    }
    if (this._recoilDebt <= 1e-5) {
      this._recoilDebt = 0;
      this._recoilIdle = 0;
      this._recoilAnchor = this.pitch;
    }
  }

  update(dt, input, world) {
    if (this.dead) return;

    // View
    const lk = input.consumeLook(dt);
    this.look(lk.dx, lk.dy);

    // Recoil recovery
    this.yaw += this.recoilYaw * Math.min(1, dt * 7);
    this.recoilYaw *= 1 - Math.min(1, dt * 7);
    this._settleRecoil(dt, this.recoilHold);
    // The barrel kick decays on its own; the view has already been credited above
    this.recoilPitch *= 1 - Math.min(1, dt * 9);

    // Crouch
    this.crouch = input.wantCrouch;
    const targetEye = this.crouch ? CROUCH_EYE : EYE;
    this.eyeH += (targetEye - this.eyeH) * Math.min(1, dt * 12);

    // Movement
    const ax = input.axis();
    const sprint = input.sprinting && ax.y > 0.1 && !this.crouch;
    // Move speed: raised walk and sprint speeds with snappier starts for a crisper feel
    let speed = this.crouch ? 2.9 : sprint ? 10.4 : 6.8;
    if (this.reloading) speed *= 0.92;
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    // Forward is (-sin, -cos), right is (cos, -sin)
    const wishX = (-sinY * ax.y + cosY * ax.x) * speed;
    const wishZ = (-cosY * ax.y - sinY * ax.x) * speed;
    // Launch acceleration: coasting after releasing the stick keeps the original damping of 22 (so the player still slides a little),
    // but from a standstill the early part of an exponential approach is too slow, so pushing the stick had noticeable lag.
    // Below half the target speed the acceleration is now 55, reaching half speed in about 13ms
    // and then returning to 22 to converge smoothly on full speed. Only the start is affected, not the coast.
    const wishLen = Math.hypot(wishX, wishZ);
    const spNow = Math.hypot(this.vel.x, this.vel.z);
    let accel = this.onGround ? 22 : 4.2;
    if (this.onGround && wishLen > 0.1 && spNow < wishLen * 0.5) accel = 55;
    this.vel.x += (wishX - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wishZ - this.vel.z) * Math.min(1, accel * dt);

    // Jump
    if (input.wantJump) {
      input.wantJump = false;
      if (this.onGround) {
        this.vel.y = 6.4;
        this.onGround = false;
        this.game.sfx.jump();
      }
    }
    this.vel.y -= 20 * dt;

    // Horizontal movement plus collision
    const prevY = this.pos.y;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    world.resolve(this.pos, PLAYER_R, this.crouch ? 1.2 : 1.75);

    // Vertical
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
      // Head collision: a simple check that blocks when under a box
      this.onGround = this.pos.y - gh < 0.06;
    }
    // Keep the player from falling through the floor
    if (this.pos.y < 0) { this.pos.y = 0; this.vel.y = 0; this.onGround = true; }

    // Footsteps and bob (step rate follows real displacement and speeds up on its own; bob reduced slightly to avoid shake)
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 1.2) {
      this.bobT += dt * hs * 1.22;
      this._stepT = (this._stepT || 0) + dt * hs;
      const stepInt = sprint ? 2.6 : 3.4;
      if (this._stepT > stepInt) { this._stepT = 0; this.game.sfx.step(); }
    } else {
      this.bobT += dt * 1.2;
    }

    // Reload
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }

    // Weapon switch
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

// ---------------- Enemy ----------------
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
    this.visT = 0;
    this.muzzleT = 0;
    this._bob = 0;

    // Tiered looks: 0 regular (red-brown) / 1 veteran (dark blue) / 2 elite (black with red IR goggles)
    const looks = [
      { color: 0x7a5c34, skin: 0xd0a07a, opt: { cap: true } },                       // sand-brown camo plus patrol cap
      { color: 0x2e3a4a, skin: 0xc99a70, opt: { vet: true } },                          // dark blue-grey camo (urban)
      { color: 0x26282c, skin: 0xb98a66, opt: { elite: true, visorColor: 0xff2a10 } }, // black kit with red goggles (GSG9)
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
    // armL / armR are [shoulder root, upper arm bone] arrays (the arms became IK bones re-solved each frame),
    // so the shoulder root is the node to swing wholesale; the upper arm's position is rewritten by IK each frame and its rotation must not be set directly.
    this.armL = Array.isArray(ud.armL) ? ud.armL[0] : ud.armL;
    this.armR = Array.isArray(ud.armR) ? ud.armR[0] : ud.armR;
    this.vest = ud.vest;
    this.flashMats = ud.flashMats;
    this.gun = ud.gun;
    this.updateArms = ud.updateArms;
    // Idle and aiming poses: rx is the asset's built-in raise (the carry baseline), and ry / rz make sure that after quaternion.copy
    // each copy starts from the same original angled carry rather than the previous aiming result
    this.gunBase = { y: this.gun.position.y, rx: this.gun.rotation.x, ry: this.gun.rotation.y, rz: this.gun.rotation.z };
    // Scaled up overall (too small before, like a toy figure); elites get one more notch
    const scl = tier === 2 ? 1.2 : tier === 1 ? 1.13 : 1.16;
    this.group.scale.setScalar(scl);
    // Collision body scaled to match
    this.radius = 0.36 * scl;
    this.height = 1.78 * scl;
  }

  get eyePos() { const k = this.group ? this.group.scale.x : 1; return new THREE.Vector3(this.pos.x, this.pos.y + 1.62 * k, this.pos.z); }

  dispose() {
    this.game.scene.remove(this.group);
    this.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } });
  }

  // Raycast hit (top down, head first)
  rayHit(origin, dir, maxDist) {
    if (this.dead) return null;
    // Head sphere (kept in sync with scale so it can still be hit after growing)
    const k = this.group.scale.x;
    const headC = new THREE.Vector3(this.pos.x, this.pos.y + 1.66 * k, this.pos.z);
    const ht = raySphere(origin, dir, headC, 0.16 * k);
    // Body capsule
    const bt = rayCapsule(origin, dir, this.pos, this.radius + 0.05, 1.5 * k);
    let best = null;
    if (ht !== null && ht <= maxDist) best = { dist: ht, head: true };
    if (bt !== null && bt <= maxDist && (!best || bt < best.dist)) best = { dist: bt, head: false };
    return best;
  }

  hurt(dmg, head, fromPos) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.hitFlash = 0;   // no more whole-body tint feedback (see the note in update)
    // Alerted after being hit
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
      // Arms relax
      if (this.armL) this.armL.rotation.z = 0.5 * e;
      if (this.armR) this.armR.rotation.z = -0.5 * e;
      return;
    }
    // Hit feedback: no whole-body tinting at all.
    // Both tried options were rejected: red tinting looked like a coat of paint, and any white flicker,
    // however faint, made the whole figure flash like cardboard. Hit feedback is entirely the blood
    // particles at the impact point (spawnImpact blood=true) plus sound, with body materials untouched.
    // The hitFlash field remains (still set on hits) but no longer drives any colour change.

    const toPlayer = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z);
    const dist = toPlayer.length();
    const targetYaw = Math.atan2(-toPlayer.x, -toPlayer.z);

    // Line of sight check
    const eye = this.eyePos;
    const target = new THREE.Vector3(player.pos.x, player.pos.y + player.eyeH * 0.92, player.pos.z);
    const dirToP = target.clone().sub(eye);
    const dLen = dirToP.length();
    dirToP.normalize();
    const wallHit = world.raycast(eye, dirToP, dLen - 0.25);
    // Other enemies blocking do not count as occlusion
    const canSee = !wallHit && !player.dead;
    const fovOk = dist < 26;
    // Sight lag: for 0.5s after losing sight the enemy still counts as seeing (the gun keeps tracking the last seen point),
    // and only a real break switches to search. Regaining sight is immediate, with no delayed reaction.
    // Otherwise, when an enemy strafes along a crate edge, canSee flips every frame and the state rattles between attack and search,
    // the gun swings between low-ready and aiming, which looks like it is spinning in the hands.
    this.visT = canSee && fovOk ? Math.max(0, this.visT - dt * 6) : this.visT + dt;
    if (this.visT < 0.5) this.seesPlayer = true;
    else if (this.seesPlayer && this.visT > 0.62) this.seesPlayer = false;

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

    // Facing
    let desiredYaw = this.yaw;
    if (this.seesPlayer) desiredYaw = targetYaw;
    else if (this.state === 'search' && this.hasLastSeen) {
      desiredYaw = Math.atan2(-(this.lastSeen.x - this.pos.x), -(this.lastSeen.z - this.pos.z));
    } else if (this.moveGoal) {
      desiredYaw = Math.atan2(-(this.moveGoal.x - this.pos.x), -(this.moveGoal.z - this.pos.z));
    }
    // Facing: the target itself is smoothed. Switching patrol points flips targetYaw instantly,
    // and chasing it directly whips the body around, dragging the barrel with it.
    if (this._desYaw == null) this._desYaw = this.yaw;
    let dY = ((desiredYaw - this._desYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this._desYaw += dY * Math.min(1, dt * 4);
    // Turn rate capped at about 130 deg/s: even an abrupt case just turns slowly, without flinging the gun.
    // Dead zone 0.02 rad (about 1.1 deg): body facing and barrel are coupled, so below this residual error
    // forcing maxTurn would oscillate around the target, showing as the gun wobbling in hand.
    let dY2 = ((this._desYaw - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(dY2) > 0.02) {
      const maxTurn = Math.max(0.02, dt * 2.3);
      this.yaw += Math.max(-maxTurn, Math.min(maxTurn, dY2));
    }

    // Movement strategy
    let mvX = 0, mvZ = 0;
    this.walkT += dt * 4;
    if (this.state === 'attack') {
      this.repathT -= dt;
      if (dist > 12) {
        // Close in
        mvX = toPlayer.x / dist; mvZ = toPlayer.z / dist;
      } else if (dist < 5) {
        // Back off to keep distance
        mvX = -toPlayer.x / dist * 0.7; mvZ = -toPlayer.z / dist * 0.7;
      }
      // Strafe
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = 1.2 + Math.random() * 1.4; this.strafeDir *= -1; }
      const sx = -toPlayer.z / (dist || 1), sz = toPlayer.x / (dist || 1);
      mvX += sx * this.strafeDir * 0.85;
      mvZ += sz * this.strafeDir * 0.85;
    } else if (this.state === 'search') {
      this.searchT -= dt;
      // Move to the player's last known position
      if (this.hasLastSeen) {
        const d2 = new THREE.Vector2(this.lastSeen.x - this.pos.x, this.lastSeen.z - this.pos.z);
        const l = d2.length();
        if (l > 1.2) { mvX = d2.x / l; mvZ = d2.y / l; }
      }
      if (this.searchT <= 0) this.state = 'idle';
    } else {
      // Patrol: random point
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
      // Pick a new direction if stuck
      if (test.distanceTo(before) > 0.002 && this.state === 'idle') this.repathT = 0;
      this.pos.x = test.x; this.pos.z = test.z;
      // Avoid overlapping
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
      // Gait: legs swing fore and aft, the torso counter-twists slightly, the body rises and falls
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
      // Idle breathing
      this.walkT += dt * 1.6;
      this.body.position.y += Math.sin(this.walkT) * 0.004;
    }

    // Ground
    this.pos.y = world.groundHeight(this.pos.x, this.pos.z, this.radius, 2);

    // Apply the body facing, then aim the gun (order matters: aimGun depends on group's world orientation,
    // so aiming first and then turning the body rotates the gun by the body angle and it looks like spinning in hand)
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    this.group.updateMatrixWorld(true);

    // Firing
    const aiming = this.state === 'attack' && this.seesPlayer;
    // Raise speed is timed by the time to come up rather than by per-frame increments, so low frame rates do not snap it
    // 0.24s to raise, a consistent baseline across all enemies.
    const aimStep = dt / 0.24;
    if (aiming) {
      this.fireCd -= dt;
      this.aimT = Math.min(1, this.aimT + aimStep);
      this.aimGun(player, this.aimT, dt);
      // Only pull the trigger once the barrel is essentially on target: the trajectory follows the barrel,
      // and firing mid-transition sends bullets while the on-screen gun still points elsewhere, so they look unaligned.
      if (this.fireCd <= 0 && !player.dead && this.aimT > 0.88) {
        const rate = this.tier === 2 ? 1.0 : this.tier === 1 ? 0.62 : 0.85;
        this.fireCd = rate * (0.85 + Math.random() * 0.5);
        this.shootAt(player, dist);
        // Muzzle climb
        this.gun.position.y += 0.012;
      }
    } else {
      // Lowering is slow, and the aim point is the last seen position rather than dropping the muzzle:
      // even if the state flickers briefly, the barrel's target barely moves and the gun looks steady.
      const decay = 1 / (this.state === 'search' ? 0.7 : 0.35);
      this.aimT = Math.max(0, this.aimT - dt * decay);
      const tgt = (this.hasLastSeen && this.aimT > 0.05) ? this.lastSeen : player.pos;
      this.aimGun({ pos: tgt }, this.aimT, dt);
      this.fireCd = Math.max(this.fireCd - dt, 0.25 + Math.random() * 0.4);
    }
    // Note: arm pose is solved by the two-bone IK in assets.js from the gun's local position,
    // and since the gun rotates about its own origin the hand joints do not follow. No extra arm rotation is added here,
    // or it would fight the IK and clip.
  }

  // Aim the barrel at the player: k from 0 to 1 blends the idle pose into the aiming pose.
  // The barrel's -Z axis is quaternion-aligned to the muzzle-to-player direction, so it shoots where it points.
  // Note: group position and orientation must already be written and updateMatrixWorld called before this,
  // or the previous frame's world matrix is read and the gun twitches in hand.
  // dt drives the final quaternion low-pass: however k jumps, the gun's angular velocity is capped and it never flings.
  aimGun(player, k, dt = 0.016) {
    const g = this.gun;
    if (!g) return;
    k = Math.max(0, Math.min(1, k));
    const gp = new THREE.Vector3();
    // The ray starts at the gun's actual world position, not the body centre plus a fixed height.
    // The gun hangs at the right hand, about 0.25m off the body centreline, and up close (within 8m) that offset
    // makes the direction from body centre differ from the muzzle-to-player direction by over ten degrees,
    // so the barrel looks off target.
    // To avoid a position-to-facing-to-position feedback loop (which drifts the barrel steadily to one side),
    // this reads the gun's world position written last frame: one frame stale, a stable input.
    g.getWorldPosition(gp);
    // The aim point is just above the chest (1.35m). It used to be 1.15m while the enemy muzzle sits at 1.6m,
    // which put the trajectory 1-3 degrees down at a dozen metres, visibly driving shots into the ground.
    // The impact being a little above or below the aim point is fine, but the whole trajectory must not tilt downward.
    const dirP = new THREE.Vector3(player.pos.x, player.pos.y + 1.35, player.pos.z)
      .sub(gp).normalize();
    const qAim = new THREE.Quaternion();
    {
      // Orientation is built explicitly from forward and up rather than by setFromUnitVectors.
      // setFromUnitVectors only constrains the barrel direction, leaving roll about the barrel axis arbitrary,
      // so small per-frame float error spins the whole gun about its own axis, which looks like it turning in the hands.
      // Fixing the world up direction pins the roll, keeping the pose stable.
      const fwd = dirP.clone();
      const upHint = new THREE.Vector3(0, 1, 0);
      // When the barrel is nearly vertical the up hint degenerates, so switch reference axes
      if (Math.abs(fwd.y) > 0.98) upHint.set(0, 0, -Math.sign(fwd.y));
      // Right-handed: right = fwd x up (not up x fwd, which is left-handed and mirrors the whole basis,
      // so qAim is no longer a pure rotation and the barrel ends up rotated to one side).
      const right = new THREE.Vector3().crossVectors(fwd, upHint).normalize();
      const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
      // Gun model: -Z at the muzzle, +Y up, +X to the gun's right
      const m = new THREE.Matrix4().makeBasis(right, up, fwd.clone().negate());
      qAim.setFromRotationMatrix(m);
    }
    const pq = new THREE.Quaternion();
    g.parent.getWorldQuaternion(pq);
    const qLocal = pq.invert().multiply(qAim);
    // Idle pose: no longer assembled from the asset's Euler angles plus a fixed lift (that rx is a model-local raise,
    // and combined with ry / rz it skews the axis, so slerping to the aiming pose flings the muzzle to one side,
    // measured 18 degrees off target with the muzzle tilted up).
    // Instead it starts from the aiming pose and presses down about the world horizontal axis (camera right) by an angle:
    // idle and aiming then share one pivot and one arc, with the barrel axis in the same vertical plane at both ends,
    // so interpolation never yaws sideways and the muzzle points exactly forward at k=1.
    const restDrop = 0.52;   // idle muzzle drop in radians (about 30 degrees), i.e. low-ready
    const axisR = new THREE.Vector3(1, 0, 0).applyQuaternion(pq.clone().invert()).normalize();
    const qRest = new THREE.Quaternion().setFromAxisAngle(axisR, restDrop).multiply(qLocal);
    // Constrain the target pose itself first. qT comes straight from the player's position, so movement makes it
    // jump every frame; even with a rate limit downstream, a fast-jumping target forces a big step each frame.
    // A rate limit (with a looser ceiling) is applied to the target too, turning steps into ramps.
    let qT = qRest.slerp(qLocal, k);
    if (!this._gunT) this._gunT = qT.clone();
    else {
      const TGT_W = 260 * Math.PI / 180;
      const aT = this._gunT.angleTo(qT);
      const stepT = Math.max(1e-4, TGT_W * Math.max(dt, 1 / 240));
      if (aT <= stepT) this._gunT.copy(qT);
      else this._gunT.slerp(qT, stepT / aT);
    }
    qT = this._gunT;
    // However steady the target, the gun only chases it at a finite rate.
    // Critical: a plain exponential low-pass (1 - exp(-dt*11)) fails at low frame rates --
    // at dt=0.17 the factor is already 0.85, effectively no filter, and one frame can swing 60 degrees, looking like spinning.
    // So it uses a hard angular rate cap: at most MAX_W * dt radians per frame.
    // But dt alone is not enough: at low frame rates dt is large, so the allowed per-frame angle grows with it
    // (130 deg/s turns 22 degrees in one frame at dt=0.17), and a single swing looks like a twitch.
    // An absolute per-frame cap, MAX_STEP, also holds the per-frame angle regardless of frame rate.
    if (!this._gunQ) this._gunQ = qT.clone();
    else {
      const MAX_W = 130 * Math.PI / 180;          // 130 deg/s: a little slower than a human raise, no flinging at low fps
      const MAX_STEP = 7 * Math.PI / 180;         // at most 7 degrees per frame: no snapping at any frame rate
      const ang = this._gunQ.angleTo(qT);
      const maxStep = Math.max(1e-4, Math.min(MAX_W * Math.max(dt, 1 / 240), MAX_STEP));
      if (ang <= maxStep) this._gunQ.copy(qT);
      else this._gunQ.slerp(qT, maxStep / ang);
    }
    g.quaternion.copy(this._gunQ);
    const yT = this.gunBase.y + 0.06 * k;
    // Snap the height on the first frame and smooth after that; otherwise pulling from 0 causes a vertical pop
    if (this._gunPosInit) g.position.y += (yT - g.position.y) * (1 - Math.exp(-dt * 11));
    else { g.position.y = yT; this._gunPosInit = true; }
    // The gun's pose changed, so the arms must re-solve in step or it looks like the gun spinning in two still hands
    g.updateMatrix();
    if (this.updateArms) this.updateArms();
  }

  shootAt(player, dist) {
    const g = this.game;
    const accuracy = this.tier === 2 ? 0.86 : this.tier === 1 ? 0.72 : 0.58;
    const distFactor = Math.max(0.35, 1 - dist / 42);
    const hitChance = accuracy * distFactor;
    // The trajectory uses the barrel direction already being rendered:
    // it no longer snaps the gun to aimT=1 at the moment of firing (which made the gun jump and showed muzzle and trajectory apart),
    // so bullets line up exactly with the on-screen barrel.
    const muzzle = new THREE.Vector3();
    const gunDir = new THREE.Vector3(0, 0, -1);
    if (this.gun) {
      this.group.updateMatrixWorld(true);
      const ml = this.gun.userData.muzzle;
      muzzle.copy(ml ? ml : new THREE.Vector3(0, 0.012, -0.62));
      this.gun.localToWorld(muzzle);
      gunDir.transformDirection(this.gun.matrixWorld);
    } else {
      muzzle.copy(this.eyePos).add(new THREE.Vector3(-Math.sin(this.yaw) * 0.55, -0.3, -Math.cos(this.yaw) * 0.55));
      gunDir.set(-Math.sin(this.yaw), -0.15, -Math.cos(this.yaw)).normalize();
    }
    // Impact point: between chest and head (1.35m to eye height). The aim point is already 1.35m,
    // and raising it here keeps the trajectory from sitting low -- at the old 1.05m all shots visibly hit the ground.
    const targetHead = new THREE.Vector3(player.pos.x, player.pos.y + (Math.random() < 0.35 ? player.eyeH : 1.35), player.pos.z);
    // The trajectory follows the barrel. aimGun has already pointed it at the player (aimT converged to 1),
    // so gun and bullet share one line, and hits are decided entirely by the random spread below.
    // Spread is a small cone about the barrel axis: offset along two perpendicular tangents, push along the barrel, then normalise,
    // so the trajectory hugs the barrel instead of being amplified diagonally into a visible 15-degree offset as with per-component noise.
    const dir = gunDir.clone();
    const hit = Math.random() < hitChance;
    const spread = hit ? 1 : 11;                       // in milliradians (1000mrad is about 57 degrees)
    if (spread > 0) {
      // Build two tangential bases perpendicular to the barrel
      const up0 = Math.abs(gunDir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const t1 = new THREE.Vector3().crossVectors(gunDir, up0).normalize();
      const t2 = new THREE.Vector3().crossVectors(gunDir, t1).normalize();
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread * 0.001;
      dir.addScaledVector(t1, Math.cos(a) * r).addScaledVector(t2, Math.sin(a) * r).normalize();
    }

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
    // On a player hit the streak stops 0.8m short, keeping a stretch of the bullet coming at you,
    // since drawing it to the impact puts it in your face, but stopping too early (1.8m was tried) hides it entirely.
    const hitPlayer = hit && endPoint === targetHead;
    g.tracer(muzzle, endPoint || muzzle.clone().addScaledVector(dir, endDist), 0xffb060, hitPlayer ? 0.8 : 0);
    // Muzzle flash: without it an enemy firing at range is barely noticeable and the muzzle direction cannot be read.
    g.spawnMuzzleFlash(muzzle, gunDir);
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
// ---------------- Enemy spawn points (supplied by the current map, see world.js MAPS[].spawns) ----------------
// Export kept for older references; at runtime game.world.spawns is used
export const SPAWNS = [];
