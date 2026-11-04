// Procedural textures and model generation (no external assets)
import * as THREE from '../vendor/three.module.min.js?v=20261104160817';

const rnd = (a, b) => a + Math.random() * (b - a);
const cvs = (size = 256) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
};
// Non-square texture (the tracer streak is a 128x32 strip, and cvs() would squash it square)
const cvsWH = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

function noise(ctx, size, amount, alpha) {
  const d = ctx.getImageData(0, 0, size, size);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    p[i] += n; p[i + 1] += n; p[i + 2] += n;
    if (alpha !== undefined) p[i + 3] = alpha;
  }
  ctx.putImageData(d, 0, 0);
}

function grunge(ctx, size, count, color, maxR) {
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    const x = Math.random() * size, y = Math.random() * size;
    const r = rnd(1, maxR);
    ctx.fillStyle = color.replace('ALPHA', rnd(0.03, 0.16).toFixed(3));
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function concreteTexture(repeat = 1) {
  const size = 256, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#6b6a66'; ctx.fillRect(0, 0, size, size);
  // Large colour patches
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rnd(80, 130) | 0},${rnd(80, 128) | 0},${rnd(76, 120) | 0},.25)`;
    ctx.fillRect(rnd(0, size), rnd(0, size), rnd(20, 90), rnd(20, 90));
  }
  noise(ctx, size, 34);
  grunge(ctx, size, 60, 'rgba(40,40,38,ALPHA)', 26);
  grunge(ctx, size, 30, 'rgba(150,150,142,ALPHA)', 18);
  // Brick joints
  ctx.strokeStyle = 'rgba(35,35,33,.55)'; ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    const off = (y / 64) % 2 ? 64 : 0;
    for (let x = off; x < size + 64; x += 128) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 64); ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function containerTexture(base = '#3c4b58', repeat = 1) {
  const size = 256, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 26);
  // Vertical ribs
  for (let x = 0; x < size; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, 'rgba(0,0,0,.30)');
    g.addColorStop(.35, 'rgba(255,255,255,.10)');
    g.addColorStop(.7, 'rgba(255,255,255,.02)');
    g.addColorStop(1, 'rgba(0,0,0,.24)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 32, size);
  }
  // Rust spots
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(${rnd(110, 150) | 0},${rnd(60, 90) | 0},40,${rnd(.05, .22).toFixed(2)})`;
    ctx.beginPath(); ctx.ellipse(rnd(0, size), rnd(0, size), rnd(4, 26), rnd(3, 12), rnd(0, 3), 0, 7); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function woodTexture(repeat = 1) {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#8a5f34'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(${rnd(60, 110) | 0},${rnd(38, 66) | 0},${rnd(16, 34) | 0},${rnd(.15, .5).toFixed(2)})`;
    ctx.lineWidth = rnd(0.5, 2.2);
    const y = rnd(0, size);
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.06 + y) * 2.2);
    ctx.stroke();
  }
  // Plank seams
  ctx.strokeStyle = 'rgba(30,18,8,.55)'; ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crateTexture() {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#a5753f'; ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 24);
  ctx.strokeStyle = 'rgba(70,44,18,.85)'; ctx.lineWidth = 9;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(size - 8, size - 8); ctx.moveTo(size - 8, 8); ctx.lineTo(8, size - 8); ctx.stroke();
  grunge(ctx, size, 30, 'rgba(50,30,10,ALPHA)', 12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function targetTexture() {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#e9e4d8'; ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const rings = [['#d33', 58], ['#e9e4d8', 48], ['#d33', 38], ['#e9e4d8', 28], ['#d33', 18], ['#f5c518', 8]];
  rings.forEach(([col, r]) => { ctx.beginPath(); ctx.fillStyle = col; ctx.arc(cx, cx, r, 0, 7); ctx.fill(); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Procedural sky dome: gradient plus clouds on a 512-wide texture, avoiding banding and dark patches from low-resolution stretching
export function skyTexture() {
  const w = 1024, h = 512, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  // Vertical gradient: deep blue zenith to hazy horizon
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.00, '#2f6fb5');
  g.addColorStop(0.18, '#4d8fd0');
  g.addColorStop(0.34, '#7ab3de');
  g.addColorStop(0.46, '#a8cbe6');
  g.addColorStop(0.50, '#c8dbea');   // horizon
  g.addColorStop(0.56, '#b7b6ad');
  g.addColorStop(0.72, '#8d8878');
  g.addColorStop(1.00, '#6d6a5e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // Thin high cloud (several layers, stretched horizontally, only in the upper sky)
  for (let i = 0; i < 220; i++) {
    const t = Math.pow(Math.random(), 1.7);
    const y = t * h * 0.44;
    const rw = 20 + Math.random() * 150 * (1 - t * 0.6);
    const rh = 3 + Math.random() * 14 * (1 - t * 0.5);
    const a = (0.03 + Math.random() * 0.11) * (1 - t * 0.5);
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * w, y, rw, rh, 0, 0, 7);
    ctx.fill();
  }
  // Fog band near the horizon (softens the sky/ground seam)
  const hz = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.55);
  hz.addColorStop(0, 'rgba(220,232,240,0)');
  hz.addColorStop(0.6, 'rgba(224,232,236,0.42)');
  hz.addColorStop(1, 'rgba(200,205,200,0)');
  ctx.fillStyle = hz; ctx.fillRect(0, h * 0.42, w, h * 0.14);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  return t;
}

// Tracer texture: shaped like a dart or torpedo in profile, not a uniform bar of light.
//   - Along the length (left to right = tail to head): a thin fading tail, widest in the middle, tapering to a sharp tip,
//     with a white-hot spot on the tip. Stretched, that reads as a projectile with a trail in flight
//     rather than a horizontal band of light.
//   - Across the width: white-hot in the middle, transparent at the edges, softly blended.
//
// Pitfall (already hit): the first version only darkened with destination-out while alpha stayed near 255,
// producing an opaque pale-yellow slab with no sense of light at all.
// It is now generated by alpha directly, which with linear filtering gives light that spreads at the edges.
export function streakTexture() {
  const w = 256, h = 64, cv = cvsWH(w, h), ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;

  // A spindle-shaped width envelope along the length: 0 at the tail, widest behind the middle, a needle at the head.
  // Two gradient segments are faster than per-pixel drawing and smooth enough.
  const body = ctx.createLinearGradient(0, 0, w, 0);
  body.addColorStop(0.00, 'rgba(255,196,110,0)');
  body.addColorStop(0.10, 'rgba(255,206,124,0.28)');
  body.addColorStop(0.34, 'rgba(255,224,152,0.62)');
  body.addColorStop(0.60, 'rgba(255,240,196,0.92)');
  body.addColorStop(0.86, 'rgba(255,252,232,1)');
  body.addColorStop(0.97, 'rgba(255,255,248,1)');
  body.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = body;
  ctx.beginPath();
  // Upper half: narrow tail, bulging middle, tapering head
  const N = 64;
  const halfAt = (t) => {
    // t: 0 (tail) -> 1 (head)
    if (t <= 0) return 0;
    if (t >= 1) return 0;
    // The front half (trail) widens slowly, the rear half (body) tapers quickly.
    // An exponent of 0.38 makes the taper arrive sooner: an enemy far away is only tens of pixels tall,
    // and a gradual taper just looks like a round nose instead of a dart tip.
    const swell = t < 0.68
      ? Math.pow(t / 0.68, 0.8)           // 0 -> 1, a slow start
      : Math.pow((1 - t) / 0.32, 0.38);   // 1 -> 0, narrowing fast to a needle at the head
    return halfAt.max * Math.min(1, swell);
  };
  halfAt.max = cy * 0.86;
  ctx.moveTo(0, cy);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    ctx.lineTo(t * w, cy - halfAt(t));
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    ctx.lineTo(t * w, cy + halfAt(t));
  }
  ctx.closePath();
  ctx.fill();

  // Width profile: a whiter core down the middle, giving the dart a bright solid-body axis
  // instead of a flat band. Composite modes other than destination-in break the shape,
  // so a narrower, brighter core is drawn additively.
  ctx.globalCompositeOperation = 'lighter';
  const core = ctx.createLinearGradient(0, 0, 0, h);
  core.addColorStop(0.0, 'rgba(255,240,200,0)');
  core.addColorStop(0.5, 'rgba(255,250,230,0.55)');
  core.addColorStop(1.0, 'rgba(255,240,200,0)');
  ctx.fillStyle = core;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const hw = halfAt(t) * 0.34;
    const x = t * w;
    ctx.fillRect(x, cy - hw, w / N + 0.5, hw * 2);
  }

  // White-hot spot at the head: a real projectile is always brightest at the tip, and without it
  // the stretched streak is evenly bright and reads as a bar again.
  const tip = ctx.createRadialGradient(w * 0.965, cy, 0, w * 0.965, cy, h * 0.30);
  tip.addColorStop(0, 'rgba(255,255,255,1)');
  tip.addColorStop(0.35, 'rgba(255,248,214,0.85)');
  tip.addColorStop(1, 'rgba(255,226,150,0)');
  ctx.fillStyle = tip;
  ctx.fillRect(w * 0.80, 0, w * 0.20, h);

  ctx.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

export function flashTexture() {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,220,1)');
  g.addColorStop(.25, 'rgba(255,220,120,.95)');
  g.addColorStop(.55, 'rgba(255,140,40,.55)');
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  // Star burst rays
  ctx.translate(64, 64);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    const lg = ctx.createLinearGradient(0, 0, 0, -64);
    lg.addColorStop(0, 'rgba(255,240,200,.9)');
    lg.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(0, -64); ctx.lineTo(4, 0); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------- Weapon models (first person, low-poly style) ----------------
const mat = (color, rough = 0.55, metal = 0.55) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function box(w, h, d, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}
function cyl(r1, r2, h, m, seg = 12) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
}

// Model orientation: -Z points at the muzzle
export function buildRifle() {
  const g = new THREE.Group();
  const receiver = mat(0x5f646b, 0.46, 0.74);   // stamped receiver (steel grey, so it never reflects sky blue)
  const steel = mat(0x7c828b, 0.34, 0.8);      // barrel / small parts
  const dark = mat(0x3d4046, 0.56, 0.62);      // dark parts
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a5a28, roughness: 0.5, metalness: 0.08 }); // walnut
  const woodD = new THREE.MeshStandardMaterial({ color: 0x7d4620, roughness: 0.55, metalness: 0.08 });
  const bakelite = new THREE.MeshStandardMaterial({ color: 0xa5541f, roughness: 0.4, metalness: 0.14 }); // bakelite magazine

  // ---- Receiver (stamped steel with a round dust cover) ----
  g.add(box(0.068, 0.078, 0.34, receiver, 0, 0, 0.05));
  const dust = cyl(0.039, 0.039, 0.3, mat(0x555a61, 0.5, 0.68), 14); // half-sunk into the receiver to form a dome
  dust.rotation.x = Math.PI / 2; dust.position.set(0, 0.042, 0.04); g.add(dust);
  // Retaining caps at each end of the receiver
  g.add(box(0.08, 0.095, 0.03, dark, 0, 0, -0.115));
  g.add(box(0.08, 0.09, 0.03, dark, 0, 0, 0.215));
  // Magazine well
  g.add(box(0.062, 0.05, 0.075, dark, 0, -0.06, 0.03));
  // ---- Fire selector and charging handle (right-side detail) ----
  g.add(box(0.014, 0.016, 0.11, dark, 0.045, -0.005, 0.10));  // selector lever
  const charge = cyl(0.011, 0.011, 0.045, steel, 8);          // charging handle
  charge.rotation.x = Math.PI / 2; charge.position.set(0.056, 0.028, 0.10); g.add(charge);

  // ---- Wooden lower handguard plus upper handguard / gas tube ----
  g.add(box(0.07, 0.055, 0.21, wood, 0, -0.012, -0.235));      // lower handguard
  g.add(box(0.05, 0.028, 0.19, woodD, 0, 0.038, -0.225));      // upper handguard
  const gasTube = cyl(0.013, 0.013, 0.2, steel, 8);            // gas tube
  gasTube.rotation.x = Math.PI / 2; gasTube.position.set(0, 0.058, -0.225); g.add(gasTube);

  // ---- Barrel / front sight / slanted brake ----
  const barrel = cyl(0.0135, 0.0135, 0.27, steel, 10);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.018, -0.475); g.add(barrel);
  // Gas block
  g.add(box(0.032, 0.05, 0.035, dark, 0, 0.03, -0.345));
  // Rear sight: the AKM tangent sight, rebuilt as a short ramp pressed onto the rear of the receiver
  // rather than a thin plate floating at an angle -- the old leaf was rotated -8 degrees about x
  // with its front 3mm off the receiver, which from hip level looked like a bright flake hovering in mid-air.
  g.add(box(0.032, 0.020, 0.052, dark, 0, 0.054, -0.090));
  g.add(box(0.026, 0.006, 0.070, steel, 0, 0.066, -0.070, -0.10));
  // ---- Front sight (v2 rework) ----
  // [Why the previous version still "looked unchanged" -- three compounding reasons]
  // 1. Colour does not separate: the blade used 0xb8c2cc, which under wScene's blue directional light (0x88b4ff)
  //    was tinted blue and matched the steel barrel, so the eye could not tell it was a separate blade.
  // 2. Position hugs the barrel: centre y=0.018, radius 0.0135, so the top edge is at y=0.0315.
  //    The blade base sat at y=0.038, only 6.5mm above it -- about 10px at the 0.50 portrait scale,
  //    hugging the blue barrel and reading as a glint on it rather than a standing sight.
  // 3. Too narrow: 7mm wide x 0.50 is about 6px, far too thin.
  // [What v2 did]
  //   - Near-white neutral 0xf0f4f8 with metalness down to 0.1 (high metalness picks up the
  //     environment tint and turns blue) and roughness 0.35, so it is the brightest point in any lighting;
  //   - base raised to y=0.036 with a 30mm blade, tip at y=0.066, 34mm above the barrel's top edge,
  //     exposing about 25-30px of blade in portrait so it clearly stands above the barrel;
  //   - width up to 9mm (about 8px in portrait) with the top 42% tapered into a wedge;
  //   - a short ring clamping the barrel plus a side brace, giving the blade a real mounting structure.
  {
    // Front sight base: a short ring over the barrel. It cannot be long or thick, or the muzzle looks sleeved --
    // the real AKM base wraps above the barrel leaving its outline on both sides, so a short ring plus a raised top block
    // expresses that, with the ring only 4mm thicker than the barrel.
    const sightBase = cyl(0.0175, 0.0175, 0.024, dark, 14);
    sightBase.rotation.x = Math.PI / 2;
    sightBase.position.set(0, 0.018, -0.575);
    g.add(sightBase);
    // The top block above the base: it only rises upward, without thickening the whole ring.
    // Slightly wider than the blade (26mm vs 10mm), but kept low or it turns into a brick.
    g.add(box(0.024, 0.014, 0.026, dark, 0, 0.031, -0.575));

    // The white front blade was removed on request ("take the white off, keep the part underneath").
    // What remains: short base ring + top block + rear brace -- a low post above the muzzle.
    // Rear brace behind the blade: ties the top block and the base into one piece
    g.add(box(0.014, 0.028, 0.014, dark, 0, 0.047, -0.563, 0.34));
  }
  // Muzzle device: brake plus a clean circular muzzle face
  // [Why it used to read as "pointed"] the 16mm slanted block, rotated 29 degrees about x, exposed a sharp corner
  // that was shorter than the brake (37mm) but farther forward, exactly the outline nearest the camera.
  // The face is now a slightly thicker ring plus a central black bore, so the muzzle is round from any angle;
  // the slanted port is expressed by a flat cut on top only, with no sharp corner.
  const brake = cyl(0.0185, 0.0185, 0.052, dark, 14);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.018, -0.622); g.add(brake);
  // Muzzle face ring: slightly thicker than the brake for a clean outer circle
  const muzzleRing = cyl(0.0195, 0.0195, 0.008, dark, 14);
  muzzleRing.rotation.x = Math.PI / 2; muzzleRing.position.set(0, 0.018, -0.6495); g.add(muzzleRing);
  // Muzzle bore: black hole so it reads as pointing forward
  const muzIn = cyl(0.0100, 0.0100, 0.010, mat(0x060708, 0.95, 0.12), 12);
  muzIn.rotation.x = Math.PI / 2; muzIn.position.set(0, 0.018, -0.6535); g.add(muzIn);
  // A small flat cut on top of the brake (the slanted port, without a sharp corner)
  g.add(box(0.024, 0.0050, 0.026, dark, 0, 0.0335, -0.626, 0.20));

  // ---- Curved "banana" magazine (bakelite, 30 rounds) ----
  // [Why it kept reading as "empty"] a smooth flat-coloured surface gives no visual evidence of rounds.
  // A real loaded magazine reads as full from two things: the **horizontal stacked-case ridges** that brass and steel press into both sides of the bakelite,
  // and the **feed-lip rib** pushed out at the front edge by the cases. Geometric strips alone are too thin to see,
  // so this version maps a stacked-case texture onto the magazine plus a continuous rib at the front edge.
  {
    // Stacked-case texture: horizontal light and dark bands (one per case) plus fine noise
    const TS = 256;
    const mcv = cvs(TS);
    const mx = mcv.getContext('2d');
    mx.fillStyle = '#6e2f0e'; mx.fillRect(0, 0, TS, TS);   // dark brown-orange bakelite base
    const N_BAND = 30;                            // 30 bands, roughly one per round
    const BAND = TS / N_BAND;
    for (let i = 0; i < N_BAND; i++) {
      const yy = i * BAND;
      // Each band: lit slightly on top, darker below, very gradual in between (not too bright or it looks like wood)
      const grd = mx.createLinearGradient(0, yy, 0, yy + BAND);
      grd.addColorStop(0, '#87401a');
      grd.addColorStop(0.6, '#71310c');
      grd.addColorStop(1, '#4a1f06');
      mx.fillStyle = grd;
      mx.fillRect(0, yy, TS, BAND);
      // Dark seam between cases
      mx.fillStyle = 'rgba(24,9,3,0.9)';
      mx.fillRect(0, yy + BAND - 1.6, TS, 2.0);
    }
    noise(mx, TS, 16);   // amount only, no alpha
    const magTex = new THREE.CanvasTexture(mcv);
    magTex.wrapS = magTex.wrapT = THREE.RepeatWrapping;
    const magMat = new THREE.MeshStandardMaterial({
      map: magTex, color: 0xc4c4c4, roughness: 0.5, metalness: 0.1,
    });

    const N = 20;                                 // finer subdivision so the bands follow the curve smoothly
    const y0 = -0.058, y1 = -0.392;
    const zTop = 0.034, zBot = -0.176;
    const wTop = 0.055, wBot = 0.050;
    const dTop = 0.086, dBot = 0.078;
    const zAt = (t) => zTop + (zBot - zTop) * t * t;
    const yAt = (t) => y0 + (y1 - y0) * t;
    const wAt = (t) => (wTop + (wBot - wTop) * t) / 2;
    const dAt = (t) => (dTop + (dBot - dTop) * t) / 2;

    // Each face gets its own vertices and UVs, no shared corners -- otherwise the bands fold into the edges
    const pos = [], uv = [], idx = [];
    const P = (t, side, w, d, y, z) => {         // side: 0 front, 1 right, 2 back, 3 left
      if (side === 0) return [-w, y, z - d];
      if (side === 1) return [w, y, z - d];
      if (side === 2) return [w, y, z + d];
      return [-w, y, z + d];
    };
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const y0i = yAt(t0), y1i = yAt(t1);
      const z0 = zAt(t0), z1 = zAt(t1);
      const w0 = wAt(t0), w1 = wAt(t1);
      const d0 = dAt(t0), d1 = dAt(t1);
      for (let side = 0; side < 4; side++) {
        const base = pos.length / 3;
        const a0 = P(t0, side, w0, d0, y0i, z0);
        const b0 = P(t0, (side + 1) % 4, w0, d0, y0i, z0);
        const a1 = P(t1, side, w1, d1, y1i, z1);
        const b1 = P(t1, (side + 1) % 4, w1, d1, y1i, z1);
        pos.push(...a0, ...b0, ...b1, ...a1);
        const u0 = side * 0.25, u1 = (side + 1) * 0.25;   // ring u never crosses a face
        uv.push(u0, t0,  u1, t0,  u1, t1,  u0, t1);
        idx.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, magMat));

    // Feed-lip rib at the front edge: one continuous narrow dark ridge following the curve
    const rp = [], ri = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = yAt(t), z = zAt(t) - dAt(t), w = wAt(t) * 0.88;
      rp.push(-w, y + 0.004, z + 0.005,  w, y + 0.004, z + 0.005,
               w, y - 0.005, z - 0.005, -w, y - 0.005, z - 0.005);
    }
    for (let i = 0; i < N; i++) {
      const a = i * 4, b = (i + 1) * 4;
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        ri.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
      }
    }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    eg.setIndex(ri);
    eg.computeVertexNormals();
    g.add(new THREE.Mesh(eg, dark));
  }
  // Floor plate: **exactly the size** of the magazine's end cross-section, laid flat on its horizontal cut.
  // [What went wrong before]
  //   1. Size 0.060x0.090, 5mm oversize per side versus the 0.050x0.078 section, left a ring of exposed metal
  //   2. Rotations of 0.80 / 0.56 poked the front edge of the plate out of the magazine face, like a board wedged in
  // The end is a flat horizontal cut (every vertex on the last ring has y = -0.392), so the plate must not be rotated.
  g.add(box(0.050, 0.009, 0.078, dark, 0, -0.3965, -0.176));

  // ---- Grip (wooden, raked back) plus trigger guard ----
  g.add(box(0.042, 0.125, 0.055, woodD, 0, -0.105, 0.15, -0.45));
  g.add(box(0.012, 0.01, 0.075, dark, 0, -0.078, 0.085));      // guard bottom
  g.add(box(0.012, 0.045, 0.01, dark, 0, -0.052, 0.048));      // guard front post
  g.add(box(0.012, 0.038, 0.01, dark, 0, -0.05, 0.122));       // guard rear post
  g.add(box(0.012, 0.04, 0.01, steel, 0, -0.055, 0.085, 0.12));// trigger

  // ---- Stock (wooden, widening toward the butt, with a cheek rest and metal butt plate) ----
  g.add(box(0.04, 0.052, 0.1, wood, 0, -0.012, 0.265));            // wrist
  g.add(box(0.044, 0.072, 0.15, wood, 0, -0.022, 0.375));          // body
  g.add(box(0.046, 0.03, 0.1, wood, 0, 0.026, 0.3, 0.06));         // cheek rest
  g.add(box(0.048, 0.092, 0.016, dark, 0, -0.03, 0.452, -0.03));   // butt plate
  // Stock-to-receiver pin
  const pin = cyl(0.008, 0.008, 0.072, steel, 6);
  pin.rotation.z = Math.PI / 2; pin.position.set(0, -0.026, 0.222); g.add(pin);

  // Holding arm (front hand on the handguard, rear hand on the grip, natural sleeve proportions)
  // One-handed hold: a single hand on the grip
  addGripHand(g, -0.105, 0.150, -0.45);

  g.traverse((o) => { o.castShadow = true; });
  // Barrel-axis anchor, used to align the sight with the muzzle (x=0 is the barrel centreline; add no lateral offset)
  g.userData.axis = { x: 0, y: 0.018, z: -0.648 };
  return g;
}

/**
 * One-handed hold: a single hand on the grip (a simplification the user asked for).
 * The palm sits on the right of the grip, four fingers wrap to the front edge, the thumb presses the left, and the wrist and forearm recede to the lower right.
 * gy/gz = grip centre y/z; tilt = grip rake (matching the grip box's rx).
 */
function addGripHand(g, gy, gz, tilt, o = {}) {
  const reach = o.reach || 0;   // fingers reach forward (-Z) so they show past the grip's front edge
  const drop = o.drop || 0;     // sink the whole hand
  const glove = new THREE.MeshStandardMaterial({ color: 0x3a3e45, roughness: 0.88, metalness: 0.06 });
  const gloveDark = new THREE.MeshStandardMaterial({ color: 0x2b2e34, roughness: 0.92, metalness: 0.04 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x4f5745, roughness: 0.95, metalness: 0.02 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98a68, roughness: 0.85 });

  // Palm: flush against the grip's right side (a thin slab, not a bulging block)
  g.add(box(0.011, 0.098, 0.076, glove, 0.0345, gy + 0.002 - drop, gz + 0.004 - reach * 0.4, tilt));
  // Back of the hand: a thick layer on the outside of the palm
  g.add(box(0.014, 0.086, 0.056, glove, 0.042, gy - 0.004, gz + 0.012, tilt));
  // Four fingers: wrap from the palm's front edge around the grip, curling left joint by joint (same as the pistol right hand)
  for (let i = 0; i < 4; i++) {
    const yy = gy + 0.038 - i * 0.0235;
    const zz = gz - 0.026 + i * 0.009 - reach;
    g.add(box(0.023, 0.0125, 0.020, glove, 0.018, yy, zz + 0.002, tilt));                    // proximal
    g.add(box(0.018, 0.0105, 0.017, gloveDark, 0.002, yy - 0.001, zz - 0.016, tilt, 0, 0.2)); // middle
    g.add(box(0.016, 0.0095, 0.014, gloveDark, -0.014, yy - 0.003, zz - 0.029, tilt, 0, 0.36)); // fingertip
  }
  // Thumb: presses the left of the grip (above the safety)
  g.add(box(0.016, 0.013, 0.044, glove, -0.024, gy + 0.058 - drop, gz - 0.012 - reach * 0.5, -0.3, 0, 0.16));
  // Web-of-hand shadow block, between the palm heel and the grip
  g.add(box(0.022, 0.030, 0.026, gloveDark, -0.006, gy - 0.048, gz + 0.006, tilt));
  // Wrist (a strip of skin, so it reads as a hand)
  g.add(box(0.052, 0.050, 0.034, skin, 0, gy - 0.076, gz + 0.058, -0.42));
  // Cuff and forearm receding to the lower right
  g.add(box(0.072, 0.076, 0.020, sleeve, 0.004, gy - 0.096, gz + 0.090, 0.42, 0, -0.08));
  g.add(box(0.064, 0.068, 0.230, sleeve, -0.004, gy - 0.150, gz + 0.180, 0.42, 0, -0.08));
}

export function buildPistol() {
  // ---- M1911A1-style semi-automatic pistol ----
  // The previous version's problem: the slide top was a bright white highlight strip (material too bright and narrow),
  // the sides were almost flat black boards and the grip was hidden by the hand, so it looked like toy bricks.
  // This version follows the real M1911's proportions and cross-sections:
  //   slide = a box wider at the top than the bottom plus 45-degree chamfer edges (the highlight sits on the edge, not the whole top);
  //   the frame has a short dust cover ahead of the trigger guard, a rounded guard and a curved trigger blade;
  //   the grip is raked 17 degrees with walnut panels leaving a metal border and visible checkering.
  const g = new THREE.Group();

  // ---- Materials: all matte metal with edge highlights, avoiding a single bright white band ----
  const steel = new THREE.MeshStandardMaterial({ color: 0x8f969f, roughness: 0.34, metalness: 0.9 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x6d757f, roughness: 0.40, metalness: 0.80 });
  const parkerized = new THREE.MeshStandardMaterial({ color: 0x666d77, roughness: 0.55, metalness: 0.70 });
  const black = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.62, metalness: 0.5 });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x53301a, roughness: 0.58, metalness: 0.04 });
  const walnutDark = new THREE.MeshStandardMaterial({ color: 0x3c2011, roughness: 0.62, metalness: 0.03 });
  const bore = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.98, metalness: 0.1 });

  // Wedge (trapezoidal section) block: gives the slide's chamfer more shape than a plain Box
  const wedge = (w0, w1, h, d, m, x, y, z) => {
    const geo = new THREE.BufferGeometry();
    const hw0 = w0 / 2, hw1 = w1 / 2, hd = d / 2, hh = h / 2;
    const v = [
      // top face (narrow) 0-3
      -hw1, hh, -hd, hw1, hh, -hd, hw1, hh, hd, -hw1, hh, hd,
      // bottom face (wide) 4-7
      -hw0, -hh, -hd, hw0, -hh, -hd, hw0, -hh, hd, -hw0, -hh, hd,
    ];
    const idx = [0,1,2, 0,2,3, 4,6,5, 4,7,6, 0,4,5, 0,5,1, 1,5,6, 1,6,2, 2,6,7, 2,7,3, 3,7,4, 3,4,0];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m2 = new THREE.Mesh(geo, m);
    m2.position.set(x, y, z);
    return m2;
  };

  const SLD_Y = 0.030;       // slide centre height
  const SLD_L = 0.272;       // slide length (shortened so the barrel clearly protrudes)
  // ============ Slide (Desert Eagle traits) ============
  // The most obvious difference between a Desert Eagle and a 1911: the slide is a wide, thick, square block,
  // nearly square in section (.50AE's slide houses a huge bolt) with a full row of vents on top,
  // the front tapering to a slanted triangular face, and a fixed barrel with gas ports underneath.
  // The earlier 0.050x0.052 narrow trapezoid looked like a square tube and nothing like a Desert Eagle.
  const SLD_W = 0.062, SLD_H = 0.062;
  const sldTop = SLD_Y + SLD_H / 2, sldBot = SLD_Y - SLD_H / 2;
  // Body: a wide thick square section with 45-degree chamfers at the corners (highlight on the edges)
  g.add(wedge(SLD_W, SLD_W - 0.012, SLD_H, SLD_L, steelDark, 0, SLD_Y, 0.012));
  // Large polished faces on both sides (a Desert Eagle slide side is one sheet of mirror steel)
  const sldSide = new THREE.MeshStandardMaterial({ color: 0x8b939d, roughness: 0.26, metalness: 0.94 });
  for (const sx of [-1, 1]) {
    g.add(box(0.004, SLD_H - 0.014, SLD_L * 0.88, sldSide, sx * (SLD_W / 2 - 0.001), SLD_Y, 0.012));
    // Narrow edge lines above and below the side: they frame the large flat face so it does not blur into one slab
    g.add(box(0.0045, 0.0035, SLD_L * 0.88, steelDark, sx * (SLD_W / 2 - 0.0005), sldTop - 0.007, 0.012));
    g.add(box(0.0045, 0.0035, SLD_L * 0.88, steelDark, sx * (SLD_W / 2 - 0.0005), sldBot + 0.007, 0.012));
  }
  // Top vents: a full row of parallel long slots (the Desert Eagle's signature feature)
  // The slot floor cannot be pure black: bore(0x050607) made the row a dead black smear that looked like keyboard keys.
  // Matte dark steel instead, darker than the slide but still picking up reflections, reads as a cut metal slot.
  const ribFloor = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.72, metalness: 0.62 });
  const SLOT_D = 0.0030;              // slot depth (how far the floor sits below the slide top)
  for (let i = 0; i < 7; i++) {
    const z = -0.052 + i * 0.0235;
    g.add(box(SLD_W - 0.016, SLOT_D, 0.013, ribFloor, 0, sldTop - SLOT_D / 2 - 0.0002, z));
  }
  // Narrow ridges on both sides of the top (the ribs between slots): they must clearly rise above the floor for the slots to read
  for (let i = 0; i < 8; i++) {
    const z = -0.064 + i * 0.0235;
    g.add(box(SLD_W - 0.010, 0.0030, 0.0105, steel, 0, sldTop + 0.0010, z));
  }
  // Front and rear face closures
  // Slide front face: two segments above and below clamp the barrel (a gap for it to pass), no longer a solid black block
  g.add(box(SLD_W, 0.020, 0.010, black, 0, SLD_Y + 0.019, -0.132));
  g.add(box(SLD_W, 0.018, 0.010, black, 0, SLD_Y - 0.020, -0.132));
  for (const sx of [-1, 1]) g.add(box(0.013, 0.022, 0.010, black, sx * 0.0245, SLD_Y - 0.001, -0.132));
  g.add(box(SLD_W + 0.002, SLD_H + 0.004, 0.012, black, 0, SLD_Y, 0.158));
  // Front chamfer: the Desert Eagle slide narrows toward the muzzle into a triangular taper.
  // It must sit on the outside of the slide and not intrude inside the barrel radius, or it plugs the muzzle.
  for (const sx of [-1, 1]) {
    g.add(box(0.0032, 0.026, 0.032, steelDark, sx * (SLD_W / 2 - 0.004), SLD_Y + 0.008, -0.146, 0, sx * 0.34, 0));
  }
  // Angled serrations at the rear (wide and shallow; the Desert Eagle has bold straight ribs)
  for (let i = 0; i < 8; i++) {
    for (const sx of [-1, 1]) {
      g.add(box(0.0035, SLD_H - 0.014, 0.0065, black, sx * (SLD_W / 2 - 0.0018), SLD_Y, 0.104 + i * 0.0105));
    }
  }
  // Ejection port (right side, large and square; the Desert Eagle's is very wide)
  g.add(box(0.004, 0.030, 0.070, bore, SLD_W / 2 - 0.0016, SLD_Y + 0.010, 0.048));

  // ============ Fixed barrel plus gas ports ============
  // The Desert Eagle has a fixed, gas-operated barrel: it shows a stretch ahead of the slide with a row of small ports below
  const barrelR = 0.0175;
  // The barrel has two parts: the section inside the slide (dark) and the thick exposed section (lit)
  const barrel = cyl(barrelR, barrelR, 0.090, steelDark, 20);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, SLD_Y + 0.004, -0.168);
  g.add(barrel);
  // Exposed section: from the slide front (-0.132) to the muzzle (-0.215), showing a complete stretch of cylinder
  const barrelOut = cyl(barrelR + 0.0004, barrelR + 0.0004, 0.085, steel, 20);
  barrelOut.rotation.x = Math.PI / 2; barrelOut.position.set(0, SLD_Y + 0.004, -0.174);
  g.add(barrelOut);
  // Muzzle ring: a thick bright steel ring that lights into an obvious ellipse, the clearest cue for "muzzle".
  // Two stacked rings, the outer slightly larger and the inner slightly smaller, with a dark seam between them, so the mouth looks thick.
  const crownOut = cyl(barrelR + 0.0018, barrelR + 0.0018, 0.006, steel, 26);
  crownOut.rotation.x = Math.PI / 2; crownOut.position.set(0, SLD_Y + 0.004, -0.2150);
  g.add(crownOut);
  const crownIn = cyl(barrelR - 0.0008, barrelR - 0.0008, 0.0085, steelDark, 26);
  crownIn.rotation.x = Math.PI / 2; crownIn.position.set(0, SLD_Y + 0.004, -0.2125);
  g.add(crownIn);
  // Bore: darker than the slide, forming a clear hole
  const boreIn = cyl(0.0128, 0.0128, 0.06, bore, 18);
  boreIn.rotation.x = Math.PI / 2; boreIn.position.set(0, SLD_Y + 0.004, -0.206);
  g.add(boreIn);
  // A bright edge along the underside of the barrel (the lit side)
  g.add(box(0.030, 0.0022, 0.070, steel, 0, SLD_Y + 0.004 - barrelR + 0.0012, -0.180));
  // Gas ports under the barrel (a Desert Eagle identifying detail)
  for (let i = 0; i < 3; i++)
    g.add(box(0.006, 0.006, 0.004, bore, 0, SLD_Y - 0.010, -0.166 - i * 0.012));

  // ============ Frame ============
  // The frame follows the new slide (0.062) down to 0.056, slightly narrower to form a step
  const FRM_Y = -0.008;
  g.add(box(0.056, 0.034, 0.250, parkerized, 0, FRM_Y, 0.010));       // frame body
  g.add(box(0.052, 0.014, 0.080, parkerized, 0, FRM_Y - 0.016, -0.092)); // dust cover (ahead of the guard)
  // Rail line between frame and slide
  for (const sx of [-1, 1])
    g.add(box(0.0025, 0.005, 0.245, black, sx * 0.0278, FRM_Y + 0.015, 0.010));

  // ============ Trigger guard (curved) ============
  // Several small blocks build the arc, far more natural than one straight block
  const guardSeg = 9;
  for (let i = 0; i <= guardSeg; i++) {
    const a = Math.PI * (0.06 + 0.88 * i / guardSeg);      // sweeps front, bottom, rear
    const r = 0.036;
    const cx = 0, cy = FRM_Y - 0.016, cz = -0.030;
    const px = 0;
    const py = cy - Math.sin(a) * r;
    const pz = cz - Math.cos(a) * r;
    const seg = box(0.011, 0.0075, 0.011, parkerized, px, py, pz, a + Math.PI / 2, 0, 0);
    g.add(seg);
  }
  // Transition from the guard's front to the frame
  g.add(box(0.011, 0.020, 0.012, parkerized, 0, FRM_Y - 0.020, -0.066));
  // Trigger (curved blade)
  g.add(box(0.010, 0.030, 0.007, steelDark, 0, FRM_Y - 0.018, -0.016, 0.16));
  g.add(box(0.008, 0.008, 0.006, black, 0, FRM_Y - 0.034, -0.014, 0.16));

  // ============ Grip (17 degree rake) ============
  const GA = -0.30;
  // Grip frame (metal, slightly smaller than the wood so a metal border shows around the panels)
  g.add(box(0.050, 0.152, 0.082, parkerized, 0, -0.100, 0.112, GA));
  // Two walnut grip panels
  for (const sx of [-1, 1]) {
    g.add(box(0.0068, 0.128, 0.066, walnut, sx * 0.0290, -0.104, 0.112, GA));
    // Diamond checkering on the panels (three shallow angled grooves)
    for (let i = 0; i < 3; i++)
      g.add(box(0.0012, 0.006, 0.054, walnutDark, sx * 0.0327, -0.062 - i * 0.026, 0.112, GA));
    // Panel screws (crosswise, flush with the panel surface)
    const screw = cyl(0.0045, 0.0045, 0.0035, steel, 8);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(sx * 0.0338, -0.100, 0.112);
    g.add(screw);
  }
  // Finger grooves on the front of the grip
  for (let i = 0; i < 3; i++)
    g.add(box(0.052, 0.004, 0.050, black, 0, -0.052 - i * 0.028, 0.088 + i * 0.008, GA));
  // Mainspring housing (the bulge at the lower rear of the grip) plus the magazine floor plate
  g.add(box(0.056, 0.036, 0.076, parkerized, 0, -0.048, 0.146, -0.12));
  g.add(box(0.054, 0.018, 0.066, black, 0, -0.178, 0.150, GA));
  // Beavertail (the guard under the hammer)
  g.add(box(0.056, 0.014, 0.056, steelDark, 0, 0.014, 0.160, -0.18));

  // ============ Controls ============
  // Hammer (raked back, with its spring)
  // Note: steel / steelDark (0x8f969f / 0x6d757f at metalness 0.8-0.9) reflected the environment
  // under real-time lighting from hip level and came out nearly pure white, orders of magnitude brighter than the slide,
  // making it the most glaring element -- from a distance it looked like a standing sight post, exactly what was asked to go away.
  // A darker, lower-metalness material brings it back to reading as a small dark metal part.
  // Metalness must stay under 0.2: the slide sits in a bright environment and anything higher blows out to white.
  const hammerMat = mat(0x2e3238, 0.55, 0.18);
  const hammerTopMat = mat(0x42474e, 0.52, 0.22);
  g.add(box(0.013, 0.032, 0.013, hammerMat, 0, SLD_Y + 0.038, 0.174, -0.55));
  g.add(box(0.019, 0.008, 0.011, hammerTopMat, 0, SLD_Y + 0.053, 0.168, -0.55));
  // Safety (small paddle on the left)
  g.add(box(0.006, 0.010, 0.028, steelDark, -0.029, FRM_Y + 0.012, 0.104, 0, 0, 0));
  // Slide stop lever
  g.add(box(0.005, 0.007, 0.034, steel, -0.0285, FRM_Y + 0.018, 0.020));
  // Magazine catch
  const magBtn = cyl(0.005, 0.005, 0.006, black, 8);
  magBtn.rotation.z = Math.PI / 2;
  magBtn.position.set(-0.029, FRM_Y - 0.012, -0.010);
  g.add(magBtn);
  // ---------- Iron sights: none ----------
  // Iron sights were removed on request.
  // They were a thin rear bar plus a wedge front post, two separate parts; both are gone,
  // leaving the slide top a clean flat plate -- the Desert Eagle's slide rib is smooth anyway,
  // so from hip level the outline is cleaner and no small part smears into a black dot when the view shrinks.

  // ============ Single hand ============
  // One-handed hold (as specified): keep the right hand, drop the left.
  addGripHand(g, -0.092, 0.118, -0.30, { reach: 0.020, drop: 0.006 });

  g.traverse((o) => { o.castShadow = true; });
  // Barrel-axis anchor for sight-to-muzzle alignment (x=0 is the barrel centreline)
  g.userData.axis = { x: 0, y: SLD_Y + 0.004, z: -0.217 };
  return g;
}

// ---------------- Enemy character (detailed soldier) ----------------
// Geometry cache: enemies share one geometry, cutting memory and GC
const _geoCache = new Map();
function gBox(w, h, d) {
  const k = `b${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!_geoCache.has(k)) _geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return _geoCache.get(k);
}
function gCyl(r1, r2, h, seg = 10) {
  const k = `c${r1.toFixed(3)},${r2.toFixed(3)},${h.toFixed(3)},${seg}`;
  if (!_geoCache.has(k)) _geoCache.set(k, new THREE.CylinderGeometry(r1, r2, h, seg));
  return _geoCache.get(k);
}
function gSph(r, ws = 10, hs = 8) {
  const k = `s${r.toFixed(3)},${ws},${hs}`;
  if (!_geoCache.has(k)) _geoCache.set(k, new THREE.SphereGeometry(r, ws, hs));
  return _geoCache.get(k);
}

// ---- Lightweight geometry merge (replaces BufferGeometryUtils, no extra dependency) ----
// Merges several transformed meshes by material into one, cutting draw calls significantly.
function mergeMeshList(meshes) {
  const list = meshes.filter((m) => m.isMesh && m.geometry && m.geometry.attributes.position);
  if (!list.length) return null;
  const names = ['position', 'normal', 'uv'];
  const parts = [];
  let total = 0;
  for (const m of list) {
    m.updateMatrix();
    let g = m.geometry.clone();
    if (!g.index) {
      // Expand non-indexed geometry into indexed form so merging is consistent
      const cnt = g.attributes.position.count;
      const idx = new (cnt > 65535 ? Uint32Array : Uint16Array)(cnt);
      for (let i = 0; i < cnt; i++) idx[i] = i;
      g.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    g.applyMatrix4(m.matrix);
    const idx = g.index;
    const arr = idx.array;
    const out = new (idx.count > 65535 ? Uint32Array : Uint16Array)(arr.length);
    for (let i = 0; i < arr.length; i++) out[i] = arr[i] + total;
    parts.push({ g, index: out });
    total += g.attributes.position.count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  for (const name of names) {
    const hasAll = parts.every((p) => p.g.attributes[name]);
    if (!hasAll) continue;
    const itemSize = parts[0].g.attributes[name].itemSize;
    const buf = new Float32Array(total * itemSize);
    let off = 0;
    for (const p of parts) {
      buf.set(p.g.attributes[name].array, off);
      off += p.g.attributes[name].array.length;
    }
    merged.setAttribute(name, new THREE.BufferAttribute(buf, itemSize));
  }
  const totalIdx = parts.reduce((a, p) => a + p.index.length, 0);
  const idxOut = new (total > 65535 ? Uint32Array : Uint16Array)(totalIdx);
  let io = 0;
  for (const p of parts) { idxOut.set(p.index, io); io += p.index.length; }
  merged.setIndex(new THREE.BufferAttribute(idxOut, 1));
  merged.computeBoundingSphere();
  const out = new THREE.Mesh(merged, list[0].material);
  out.castShadow = true;
  return out;
}

/** Merge all static meshes under group by material (skipping dynamic nodes in the keep set) */
function bakeStatics(group, keep) {
  const keepSet = new Set(keep || []);
  const byMat = new Map();
  const remove = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    // Dynamic nodes (gun, limbs) stay separate
    let p = o;
    while (p && p !== group) { if (keepSet.has(p)) return; p = p.parent; }
    const key = o.material;
    if (!byMat.has(key)) byMat.set(key, []);
    byMat.get(key).push(o);
    remove.push(o);
  });
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const m = mergeMeshList(list);
    if (!m) continue;
    m.material = mat;
    group.add(m);
    list.forEach((o) => { if (o.parent) o.parent.remove(o); });
  }
  return group;
}

// Simple part helper: position, rotation and scale in one call
function part(geo, material, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  return m;
}

// Camouflage cloth material (procedural camo texture, cached per base colour)
const _camoCache = new Map();
function camoMat(hex, rough = 0.88) {
  // Normalise the key: multiplyScalar produces float colours, and without rounding one camo set would be cached many times
  const key = `${(hex >>> 0)}_${rough.toFixed(2)}`;
  if (_camoCache.has(key)) return _camoCache.get(key);
  const c = new THREE.Color(hex);
  const size = 128, cv = cvs(size), ctx = cv.getContext('2d');
  ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect(0, 0, size, size);
  const dark = c.clone().multiplyScalar(0.55).getHexString();
  const mid = c.clone().multiplyScalar(0.78).getHexString();
  const light = c.clone().offsetHSL(0.015, 0.04, 0.1).getHexString();
  // Three layers of irregular camo patches
  [[dark, 26, 9, 22], [mid, 22, 7, 16], [light, 16, 5, 11]].forEach(([col, n, rMin, rMax]) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `#${col}`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, rnd(rMin, rMax), rnd(rMin * 0.5, rMax * 0.7), rnd(0, 3), 0, 7);
      ctx.fill();
    }
  });
  // Cloth grain noise
  const d = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
  }
  ctx.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.6, 1.6);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: rough, metalness: 0.03 });
  _camoCache.set(key, m);
  return m;
}

// Rounded box (a scaled sphere approximation for a softer torso silhouette)
function rBox(w, h, d, r = 0.55) {
  const k = `r${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!_geoCache.has(k)) {
    const g = new THREE.BoxGeometry(w, h, d, 2, 3, 2);
    const pos = g.attributes.position;
    const hw = w / 2 - r * 0.06, hh = h / 2 - r * 0.06, hd = d / 2 - r * 0.06;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Pull vertices inward to round the corners
      const nx = Math.max(-hw, Math.min(hw, v.x));
      const ny = Math.max(-hh, Math.min(hh, v.y));
      const nz = Math.max(-hd, Math.min(hd, v.z));
      const dx = v.x - nx, dy = v.y - ny, dz = v.z - nz;
      const len = Math.hypot(dx, dy, dz);
      if (len > 1e-6) {
        const k2 = r * 0.9 / r;
        const s = 1 - 0.12 * r;
        v.x = nx + dx * s; v.y = ny + dy * s; v.z = nz + dz * s;
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    _geoCache.set(k, g);
  }
  return _geoCache.get(k);
}

/**
 * Build the weapon in an enemy's hands: an AK-47 (procedural wood grain, brushed steel maps, full small-part set).
 * Orientation: -Z at the muzzle, +Y up, origin near the receiver centre (easy to attach to a hand).
 * Returns { group, muzzleLocal }, where muzzleLocal is the muzzle position in group-local space,
 * used to place the flash when firing.
 */
const _gunTexCache = new Map();

function gunWoodTexture() {
  if (_gunTexCache.has('wood')) return _gunTexCache.get('wood');
  const size = 128, cv = cvs(size), ctx = cv.getContext('2d');
  ctx.fillStyle = '#8a4a1e'; ctx.fillRect(0, 0, size, size);
  // Wood grain: several dark lines with slight undulation
  for (let i = 0; i < 90; i++) {
    const y = rnd(0, size);
    const amp = rnd(0.5, 2.6);
    ctx.strokeStyle = `rgba(${(40 + rnd(0, 40)) | 0},${(18 + rnd(0, 22)) | 0},8,${rnd(0.05, 0.3).toFixed(3)})`;
    ctx.lineWidth = rnd(0.4, 1.8);
    ctx.beginPath();
    for (let x = 0; x <= size; x += 6) {
      const yy = y + Math.sin((x / size) * Math.PI * rnd(0.6, 2.2) + i) * amp;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // Light highlight fibers
  for (let i = 0; i < 26; i++) {
    const y = rnd(0, size);
    ctx.strokeStyle = `rgba(190,120,60,${rnd(0.04, 0.14).toFixed(3)})`;
    ctx.lineWidth = rnd(0.5, 1.4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + rnd(-4, 4), size * 0.7, y + rnd(-4, 4), size, y + rnd(-3, 3));
    ctx.stroke();
  }
  noise(ctx, size, 16);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  _gunTexCache.set('wood', t);
  return t;
}

function gunSteelTexture() {
  if (_gunTexCache.has('steel')) return _gunTexCache.get('steel');
  const size = 96, cv = cvs(size), ctx = cv.getContext('2d');
  ctx.fillStyle = '#565c63'; ctx.fillRect(0, 0, size, size);
  // Brushed grain
  for (let i = 0; i < 2600; i++) {
    const v = (70 + Math.random() * 70) | 0;
    ctx.fillStyle = `rgba(${v},${v + 3},${v + 7},${rnd(0.08, 0.34).toFixed(2)})`;
    ctx.fillRect(rnd(0, size), rnd(0, size), rnd(0.6, 2), rnd(0.6, 2));
  }
  // Scratches
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = `rgba(${110 + rnd(0, 50) | 0},${112 + rnd(0, 50) | 0},${118 + rnd(0, 50) | 0},${rnd(0.05, 0.2).toFixed(2)})`;
    ctx.lineWidth = rnd(0.4, 1.1);
    const x = rnd(0, size), y = rnd(0, size);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(-18, 18), y + rnd(-5, 5)); ctx.stroke();
  }
  noise(ctx, size, 14);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  _gunTexCache.set('steel', t);
  return t;
}

// Weapon materials are shared globally by all enemies to avoid per-enemy allocation (and cut state switches)
let _gunMats = null;
function gunMaterials() {
  if (_gunMats) return _gunMats;
  const woodT = gunWoodTexture(), steelT = gunSteelTexture();
  _gunMats = {
    wood: new THREE.MeshStandardMaterial({ map: woodT, color: 0xffffff, roughness: 0.52, metalness: 0.05 }),
    steel: new THREE.MeshStandardMaterial({ map: steelT, color: 0xffffff, roughness: 0.38, metalness: 0.82 }),
    receiver: new THREE.MeshStandardMaterial({ map: steelT, color: 0x9aa0a8, roughness: 0.44, metalness: 0.78 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.52, metalness: 0.6 }),
    bakelite: new THREE.MeshStandardMaterial({ color: 0x9a4d1c, roughness: 0.42, metalness: 0.12 }),
    bore: new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.95, metalness: 0.15 }),
    red: new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 1.6, roughness: 0.3 }),
    dot: new THREE.MeshStandardMaterial({ color: 0x301010, emissive: 0xd01818, emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.3 }),
  };
  return _gunMats;
}

export function buildEnemyRifle(variant = 'ak') {
  const g = new THREE.Group();
  const GM = gunMaterials();
  const { wood, steel, receiver, dark, bakelite, bore } = GM;

  // ============ Receiver (stamped steel with a round dust cover) ============
  g.add(part(rBox(0.056, 0.072, 0.30, 0.35), receiver, 0, 0, 0.02));
  // Round dust cover (half-sunk to form a dome, the AK's signature outline)
  const dust = part(gCyl(0.036, 0.036, 0.26, 16), receiver, 0, 0.034, 0.01, Math.PI / 2, 0, 0);
  g.add(dust);
  // Latch at the rear of the dust cover
  g.add(part(gCyl(0.012, 0.012, 0.016, 8), dark, 0, 0.05, 0.145, Math.PI / 2, 0, 0));
  // Receiver end caps
  g.add(part(rBox(0.066, 0.086, 0.024, 0.3), dark, 0, 0, -0.115));
  g.add(part(rBox(0.066, 0.082, 0.02, 0.3), dark, 0, 0, 0.16));
  // Magazine well (angled cut)
  g.add(part(rBox(0.05, 0.05, 0.07, 0.3), dark, 0, -0.052, 0.02, 0.1, 0, 0));
  // Fire selector (long lever on the right)
  g.add(part(rBox(0.01, 0.014, 0.1, 0.3), dark, 0.032, -0.004, 0.075));
  g.add(part(gCyl(0.009, 0.009, 0.012, 6), steel, 0.038, -0.004, 0.02, 0, 0, Math.PI / 2));
  // Charging handle (cylinder on the right)
  g.add(part(gCyl(0.009, 0.009, 0.04, 8), steel, 0.04, 0.026, 0.075, Math.PI / 2, 0, 0));
  // Receiver rivets
  for (const z of [-0.06, 0.0, 0.06]) {
    g.add(part(gCyl(0.004, 0.004, 0.06, 6), steel, 0, -0.02, z, Math.PI / 2, 0, 0));
  }

  // ============ Wooden handguard plus gas tube ============
  // Lower handguard (narrowing above and below)
  g.add(part(rBox(0.058, 0.046, 0.2, 0.5), wood, 0, -0.008, -0.21));
  // Two finger grooves on the handguard (thin dark strips)
  g.add(part(gBox(0.062, 0.004, 0.012), dark, 0, -0.006, -0.16));
  g.add(part(gBox(0.062, 0.004, 0.012), dark, 0, -0.006, -0.25));
  // Upper handguard (wood over the gas tube)
  g.add(part(rBox(0.046, 0.026, 0.185, 0.5), wood, 0, 0.033, -0.205));
  // Gas tube
  g.add(part(gCyl(0.012, 0.012, 0.19, 10), steel, 0, 0.05, -0.2, Math.PI / 2, 0, 0));
  // Gas block (front of the handguard, joining barrel and gas tube)
  g.add(part(rBox(0.034, 0.062, 0.032, 0.3), dark, 0, 0.018, -0.31));
  g.add(part(gCyl(0.008, 0.008, 0.04, 6), steel, 0.02, 0.03, -0.31, 0, 0, Math.PI / 2));

  // ============ Barrel / front sight / brake ============
  g.add(part(gCyl(0.0125, 0.0125, 0.26, 12), steel, 0, 0.012, -0.44, Math.PI / 2, 0, 0));
  // Rear sight base plus tangent leaf
  g.add(part(rBox(0.03, 0.026, 0.05, 0.3), dark, 0, 0.052, -0.085));
  g.add(part(gBox(0.024, 0.006, 0.07), steel, 0, 0.068, -0.062, -0.1));
  g.add(part(gBox(0.03, 0.014, 0.008), dark, 0, 0.078, -0.098));
  // Front sight base
  g.add(part(rBox(0.028, 0.046, 0.03, 0.3), dark, 0, 0.022, -0.545));
  // Front sight ears (two plates)
  g.add(part(gBox(0.008, 0.032, 0.012), dark, -0.017, 0.062, -0.545));
  g.add(part(gBox(0.008, 0.032, 0.012), dark, 0.017, 0.062, -0.545));
  g.add(part(gBox(0.026, 0.006, 0.012), dark, 0, 0.078, -0.545));
  // Front sight post
  g.add(part(gCyl(0.003, 0.003, 0.022, 6), steel, 0, 0.055, -0.545));
  // Bayonet lug / cleaning rod underneath
  g.add(part(gCyl(0.004, 0.004, 0.2, 6), steel, 0, -0.028, -0.44, Math.PI / 2, 0, 0));
  // Muzzle brake (slanted port)
  g.add(part(gCyl(0.017, 0.017, 0.056, 12), dark, 0, 0.012, -0.595, Math.PI / 2, 0, 0));
  g.add(part(gBox(0.032, 0.014, 0.03), dark, 0, 0.024, -0.618, 0.46));
  // Muzzle bore (black hole)
  g.add(part(gCyl(0.0085, 0.0085, 0.024, 10), bore, 0, 0.012, -0.618, Math.PI / 2, 0, 0));

  // ============ Curved banana magazine (three progressive segments plus stiffening ribs) ============
  g.add(part(rBox(0.044, 0.1, 0.062, 0.25), bakelite, 0, -0.098, 0.008, 0.16, 0, 0));
  g.add(part(rBox(0.043, 0.09, 0.06, 0.25), bakelite, 0, -0.185, -0.022, 0.4, 0, 0));
  g.add(part(rBox(0.041, 0.082, 0.057, 0.25), bakelite, 0, -0.268, -0.072, 0.64, 0, 0));
  // Floor plate
  g.add(part(rBox(0.046, 0.012, 0.062, 0.2), dark, 0, -0.308, -0.108, 0.7, 0, 0));
  // Side stiffening ribs
  g.add(part(gBox(0.05, 0.006, 0.01), dark, 0, -0.13, 0.038, 0.28, 0, 0));
  g.add(part(gBox(0.049, 0.006, 0.01), dark, 0, -0.205, -0.006, 0.5, 0, 0));
  // Magazine catch
  g.add(part(gBox(0.012, 0.016, 0.014), steel, 0.026, -0.062, 0.03));

  // ============ Grip plus trigger group ============
  g.add(part(rBox(0.038, 0.115, 0.05, 0.45), bakelite, 0, -0.088, 0.115, -0.42, 0, 0));
  // Grip serrations (three cross ridges)
  for (const dy of [-0.03, -0.06, -0.09]) {
    g.add(part(gBox(0.04, 0.005, 0.008), dark, 0, dy, 0.132 - dy * 0.35, -0.42, 0, 0));
  }
  // Trigger guard (bottom edge plus front and rear posts)
  g.add(part(gBox(0.01, 0.008, 0.062), dark, 0, -0.058, 0.058));
  g.add(part(gBox(0.01, 0.038, 0.008), dark, 0, -0.04, 0.028));
  g.add(part(gBox(0.01, 0.03, 0.008), dark, 0, -0.042, 0.09));
  // Trigger
  g.add(part(gBox(0.008, 0.03, 0.008), steel, 0, -0.044, 0.058, 0.2, 0, 0));

  // ============ Stock (wooden: wrist, body, butt plate) ============
  g.add(part(rBox(0.038, 0.046, 0.09, 0.4), wood, 0, -0.01, 0.2));
  g.add(part(rBox(0.042, 0.066, 0.14, 0.35), wood, 0, -0.018, 0.29));
  // Cheek rest
  g.add(part(gBox(0.043, 0.024, 0.09), wood, 0, 0.016, 0.225, 0.09, 0, 0));
  // Butt plate (metal)
  g.add(part(rBox(0.046, 0.084, 0.014, 0.2), dark, 0, -0.024, 0.368, -0.04, 0, 0));
  // Sling swivels
  g.add(part(gBox(0.006, 0.016, 0.012), steel, 0.026, -0.05, 0.33));
  g.add(part(gBox(0.006, 0.016, 0.012), steel, -0.026, -0.05, -0.28));

  // ============ Attachments by tier (veterans get a red dot, elites a suppressor and laser) ============
  if (variant === 'elite') {
    // Suppressor (thick tube plus end cap), moderate length so it never becomes a spear
    g.add(part(gCyl(0.023, 0.023, 0.115, 14), dark, 0, 0.012, -0.638, Math.PI / 2, 0, 0));
    g.add(part(gCyl(0.025, 0.025, 0.01, 14), steel, 0, 0.012, -0.698, Math.PI / 2, 0, 0));
    g.add(part(gCyl(0.011, 0.011, 0.007, 10), bore, 0, 0.012, -0.704, Math.PI / 2, 0, 0));
    // Heat rings on the suppressor
    g.add(part(gCyl(0.0245, 0.0245, 0.006, 14), steel, 0, 0.012, -0.61, Math.PI / 2, 0, 0));
    // Laser designator (under the rail)
    g.add(part(rBox(0.026, 0.026, 0.06, 0.3), dark, 0, -0.038, -0.2));
    g.add(part(gCyl(0.006, 0.006, 0.008, 8), GM.red, 0, -0.038, -0.232, Math.PI / 2, 0, 0));
  } else if (variant === 'vet') {
    // Side-mounted red dot
    g.add(part(rBox(0.026, 0.014, 0.05, 0.3), dark, 0, 0.062, -0.02));
    g.add(part(gCyl(0.016, 0.016, 0.05, 12), dark, 0, 0.082, -0.02, Math.PI / 2, 0, 0));
    g.add(part(gCyl(0.0135, 0.0135, 0.006, 12), GM.dot, 0, 0.082, -0.046, Math.PI / 2, 0, 0));
  }

  // Muzzle position in local space (for the flash)
  const muzzleZ = variant === 'elite' ? -0.712 : -0.625;
  g.userData.muzzle = new THREE.Vector3(0, 0.012, muzzleZ);
  // The gun moves as a unit, so its parts are merged (about 60 meshes down to 6-8)
  bakeStatics(g, []);
  return g;
}

/**
 * Build an enemy soldier model.
 * @param {number} color  main uniform colour (varies by elite tier)
 * @param {number} skin   skin tone
 * @param {object} opt    { elite:boolean, cap:boolean, visorColor }
 */
export function buildSoldier(color = 0xb03a3a, skin = 0xd0a07a, opt = {}) {
  const elite = !!opt.elite;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // ---- Materials ----
  const cloth = camoMat(color, 0.9);                       // camo jacket
  const clothDark = camoMat(new THREE.Color(color).multiplyScalar(0.6).getHex(), 0.92); // camo trousers
  const pad = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.78, metalness: 0.22 });
  const dark2m = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.7, metalness: 0.3 });
  const vestM = new THREE.MeshStandardMaterial({ color: elite ? 0x2b2f36 : 0x3a3e45, roughness: 0.9, metalness: 0.1 });
  const webbing = new THREE.MeshStandardMaterial({ color: 0x4a4a3e, roughness: 0.95, metalness: 0.02 });
  const skinc = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.82, metalness: 0.02 });
  const maskM = new THREE.MeshStandardMaterial({ color: 0x26262a, roughness: 0.88, metalness: 0.03 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.6 });
  const soleM = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.98 });
  const glass = new THREE.MeshStandardMaterial({
    color: opt.visorColor || (elite ? 0x8a2a1a : 0x2f4858),
    roughness: 0.08, metalness: 0.95, emissive: elite ? 0x5a0d04 : 0x000000, emissiveIntensity: elite ? 0.9 : 0,
  });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6b7078, roughness: 0.42, metalness: 0.86 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2e3136, roughness: 0.52, metalness: 0.72 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x27282b, roughness: 0.88, metalness: 0.06 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: elite ? 0xd8a53a : 0xc9c4b4, roughness: 0.55, metalness: 0.45,
  });

  // ---- Pelvis / belt ----
  body.add(part(rBox(0.31, 0.19, 0.21, 0.7), clothDark, 0, 0.9, 0));
  body.add(part(gBox(0.335, 0.048, 0.225), leather, 0, 0.985, 0));
  body.add(part(gBox(0.052, 0.042, 0.026), accentMat, 0, 0.985, -0.116));
  body.add(part(rBox(0.08, 0.09, 0.065, 0.5), webbing, -0.17, 0.905, -0.04, 0, 0.2, 0));
  body.add(part(rBox(0.08, 0.09, 0.065, 0.5), webbing, 0.17, 0.905, -0.04, 0, -0.2, 0));

  // ---- Torso (rounded human silhouette: narrow waist, broad chest, sloped shoulders) ----
  body.add(part(rBox(0.29, 0.2, 0.19, 0.7), cloth, 0, 1.1, 0));
  const torso = part(rBox(0.34, 0.16, 0.21, 0.7), cloth, 0, 1.24, 0);
  body.add(torso);
  const chest = part(rBox(0.375, 0.2, 0.225, 0.8), cloth, 0, 1.4, 0);
  body.add(chest);
  body.add(part(gBox(0.018, 0.4, 0.01), clothDark, 0, 1.28, -0.108));
  body.add(part(gBox(0.05, 0.36, 0.02), webbing, -0.08, 1.31, -0.11, 0, 0, 0.38));

  // ---- Tactical vest (close-fitting, narrower than the shoulders) ----
  const vest = part(rBox(0.295, 0.3, 0.235, 0.55), vestM, 0, 1.315, 0);
  body.add(vest);
  body.add(part(rBox(0.3, 0.05, 0.225, 0.5), vestM, 0, 1.468, -0.004));   // shoulder straps
  // Magazine pouches (two on the front, with flaps and buckles)
  for (const dx of [-0.075, 0.075]) {
    body.add(part(rBox(0.076, 0.098, 0.042, 0.42), pad, dx, 1.212, -0.14));
    body.add(part(gBox(0.078, 0.018, 0.046), webbing, dx, 1.258, -0.142));
    body.add(part(gBox(0.014, 0.012, 0.008), accentMat, dx, 1.246, -0.164));
    // Pouch stitching
    body.add(part(gBox(0.07, 0.003, 0.004), webbing, dx, 1.176, -0.161));
  }
  // MOLLE horizontal webbing (three rows)
  for (const y of [1.35, 1.395, 1.44]) {
    body.add(part(gBox(0.26, 0.009, 0.006), webbing, 0, y, -0.117));
  }
  // Side cinch straps plus side plates
  body.add(part(gBox(0.008, 0.03, 0.2), webbing, -0.148, 1.29, -0.005));
  body.add(part(gBox(0.008, 0.03, 0.2), webbing, 0.148, 1.29, -0.005));
  // Velcro chest patch (ID strip, in a light colour)
  body.add(part(gBox(0.09, 0.026, 0.004), accentMat, 0, 1.452, -0.118));
  // Shoulder pads
  for (const sx of [-1, 1]) {
    body.add(part(rBox(0.09, 0.055, 0.13, 0.5), clothDark, sx * 0.145, 1.468, -0.01, 0, 0, sx * 0.35));
  }
  // Canteen on the left / radio on the right (asymmetric detail, avoiding a mirrored look)
  body.add(part(rBox(0.06, 0.1, 0.055, 0.5), webbing, -0.172, 1.19, 0.045));
  body.add(part(rBox(0.055, 0.085, 0.05, 0.5), leather, 0.172, 1.2, 0.05));
  body.add(part(gCyl(0.004, 0.004, 0.12, 6), dark2m, 0.175, 1.28, 0.05, 0.2, 0, 0));

  // ---- Head: tactical helmet plus face mask, leaving only a narrow eye slit ----
  // The old build was a black head, a flesh-coloured sphere for the face and two white dots for pupils,
  // which up close looked like a flesh sticker with protruding white eyeballs.
  // Rebuilt: a helmet shell covers the upper head, a mask covers the lower face, and a dark visor sits between them,
  // with eyes behind the lens giving a faint red or cold blue reflection, so it reads as a person in gear, not a face.
  const _h = (y) => 1.646 + y;   // head-local height (dropped slightly to give the helmet room and avoid poke-through)

  // Neck (camo collar plus neck guard)
  body.add(part(gCyl(0.049, 0.062, 0.075, 14), cloth, 0, 1.552, 0.004));
  body.add(part(gCyl(0.056, 0.056, 0.014, 14), webbing, 0, 1.516, 0.004));

  // Skull: a slightly narrowed ellipsoid as the liner for mask and helmet (dark, only for volume and occlusion)
  const skullMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.9, metalness: 0.02 });
  const head = part(gSph(0.101, 20, 16), skullMat, 0, _h(0.004), 0.006, 0, 0, 0, 0.90, 1.06, 0.98);
  body.add(head);

  // Mask (lower face): covers from the bridge of the nose down, with vertical pleats and a cloth-like material
  const maskCloth = new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.94, metalness: 0.02 });
  body.add(part(gSph(0.088, 18, 14), maskCloth, 0, _h(-0.030), -0.016, 0, 0, 0, 1.0, 0.86, 0.92));
  // Mask pleats: three shallow grooves from the nose wings to the jaw
  for (const [dx, rz] of [[-0.042, 0.42], [0, 0], [0.042, -0.42]]) {
    body.add(part(gBox(0.009, 0.062, 0.008), new THREE.MeshStandardMaterial({ color: 0x191a1d, roughness: 0.96 }),
      dx, _h(-0.044), -0.086, 0.18, 0, rz));
  }
  // Rigid piece at the nose bridge of the mask (nose guard)
  body.add(part(rBox(0.042, 0.05, 0.026, 0.4), pad, 0, _h(-0.004), -0.088, 0.16));

  // Visor: one convex lens (moved forward, sitting on the mask rather than sunk in) with frames at the sides
  const lensMat = new THREE.MeshStandardMaterial({
    color: elite ? 0x93280f : 0x566b7c, roughness: 0.1, metalness: 0.5,
  });
  const lensDark = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.42, metalness: 0.3 });
  const glint = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.04, metalness: 0.1 });

  // Frame (outer, dark) plus lens (inner, bright)
  // Height at _h(0.006): the helmet body is at _h(0.020), the brim at _h(0.022), the mask at _h(-0.030),
  // so the visor must sit between brow and cheekbone: higher and the brim clips it, lower and it slides onto the mask.
  body.add(part(rBox(0.136, 0.042, 0.020, 0.45), lensDark, 0, _h(0.006), -0.084));
  body.add(part(rBox(0.120, 0.028, 0.014, 0.45), lensMat, 0, _h(0.006), -0.095));
  // Side arms of the visor
  for (const sx of [-1, 1])
    body.add(part(rBox(0.024, 0.023, 0.042, 0.5), lensDark, sx * 0.076, _h(0.006), -0.060, 0, sx * 0.35, 0));
  // Lens highlights: two angled strips so the glass catches light
  for (const sx of [-1, 1])
    body.add(part(gBox(0.032, 0.004, 0.003), glint, sx * 0.028, _h(0.014), -0.103, 0, 0, -0.26));
  // Eye reflections behind the lens (no white eyeballs)
  const eyeGlow = new THREE.MeshStandardMaterial({
    color: elite ? 0xff3a20 : 0xa89070, emissive: elite ? 0xa01000 : 0x0e0a06,
    emissiveIntensity: elite ? 1.2 : 0.5, roughness: 0.5,
  });
  for (const sx of [-1, 1])
    body.add(part(gBox(0.014, 0.007, 0.002), eyeGlow, sx * 0.027, _h(0.005), -0.101));

  // Helmet: a shell covering the upper 60%, its front edge over the brow
  const helmetMat = elite
    ? new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.72, metalness: 0.28 })
    : camoMat(new THREE.Color(color).multiplyScalar(1.05).getHex(), 0.92);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.108, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), helmetMat);
  shell.position.set(0, _h(0.020), 0.004);
  shell.scale.set(1.02, 1.06, 1.05);
  helmetMat.side = THREE.FrontSide;
  body.add(shell);
  // Brim (a thickened ring)
  body.add(part(gCyl(0.110, 0.113, 0.013, 22), elite ? pad : clothDark, 0, _h(0.022), 0.004, 0, 0, 0, 1.03, 1, 1.06));
  // Helmet peak (pushed down to shade the top of the visor)
  body.add(part(rBox(0.176, 0.012, 0.046, 0.4), helmetMat, 0, _h(0.056), -0.082, -0.24));
  // Side rails plus side attachments (asymmetric, like real gear)
  for (const sx of [-1, 1]) {
    body.add(part(gBox(0.008, 0.026, 0.070), pad, sx * 0.106, _h(0.030), -0.012, 0, 0, 0));
    body.add(part(gCyl(0.007, 0.007, 0.014, 8), metal, sx * 0.112, _h(0.046), 0.010, 0, 0, Math.PI / 2));
  }
  // Low-profile headset on the left ear plus a boom mic (right side left empty to avoid mirroring)
  body.add(part(gCyl(0.028, 0.028, 0.016, 14), pad, -0.104, _h(-0.006), 0.012, 0, 0, Math.PI / 2));
  body.add(part(gCyl(0.012, 0.010, 0.010, 10), dark2m, -0.114, _h(-0.006), 0.012, 0, 0, Math.PI / 2));
  const micArm = part(rBox(0.007, 0.007, 0.062, 0.4), dark2m, -0.092, _h(-0.020), -0.038, 0.30, 0.32, 0);
  body.add(micArm);
  body.add(part(gSph(0.011, 8, 6), dark2m, -0.070, _h(-0.030), -0.070));
  // Neck cloth hanging from the rear of the helmet
  body.add(part(rBox(0.148, 0.072, 0.016, 0.5), elite ? clothDark : cloth, 0, _h(-0.026), 0.092, 0.30));
  // ID band at the rear of the helmet
  body.add(part(gBox(0.062, 0.010, 0.004), accentMat, 0, _h(0.052), 0.098, 0.42));

  if (opt.cap) {
    // Patrol cap (all tiers; elites switch to a helmet and have no peak)
    body.add(part(gCyl(0.108, 0.110, 0.020, 22), clothDark, 0, _h(0.052), 0.004, 0, 0, 0, 1.02, 1, 1.04));
    body.add(part(rBox(0.150, 0.010, 0.058, 0.4), clothDark, 0, _h(0.044), -0.082, -0.12));
    body.add(part(gBox(0.020, 0.016, 0.005), accentMat, 0, _h(0.058), -0.098));
  }
  void _h; void skullMat;
  // ---- Legs (cylinders plus spherical knees, tapering naturally) ----
  const mkLeg = (sx) => {
    const g = new THREE.Group();
    g.position.set(sx, 0.9, 0);
    g.add(part(gCyl(0.084, 0.068, 0.44, 12), clothDark, 0, -0.22, 0));
    g.add(part(gSph(0.066, 10, 8), clothDark, 0, -0.45, 0.004, 0, 0, 0, 1, 1, 0.95));
    g.add(part(gCyl(0.066, 0.052, 0.4, 12), clothDark, 0, -0.66, 0.008));
    g.add(part(gCyl(0.069, 0.069, 0.028, 12), leather, 0, -0.52, 0.008));
    g.add(part(rBox(0.115, 0.1, 0.17, 0.5), leather, 0, -0.9, 0.008));
    g.add(part(rBox(0.1, 0.068, 0.085, 0.5), leather, 0, -0.914, -0.09));
    g.add(part(gBox(0.118, 0.026, 0.265), soleM, 0, -0.95, -0.02));
    body.add(g);
    return g;
  };
  const legL = mkLeg(-0.093), legR = mkLeg(0.093);

  // ---- AK-47 in hand (attachments vary by tier) ----
  const gun = buildEnemyRifle(elite ? 'elite' : (opt.vet ? 'vet' : 'ak'));
  // The gun is angled across the chest (stock at the right shoulder, muzzle to the front left), a real low-ready pose;
  // when aiming, game.js raises it another 0.45rad about X to near horizontal
  const GUN_POS = new THREE.Vector3(0.05, 1.245, -0.28);
  const GUN_ROT = new THREE.Euler(0.06, 0.44, 0.05);
  gun.position.copy(GUN_POS);
  gun.rotation.copy(GUN_ROT);
  gun.scale.setScalar(0.94);
  body.add(gun);

  // ---- Arms: two-bone IK so the gloves actually hold the handguard and grip ----
  // Conversion from gun-local to body coordinates
  const gq = new THREE.Quaternion().setFromEuler(GUN_ROT);
  const gs = 0.94;
  const toBody = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).multiplyScalar(gs).applyQuaternion(gq).add(GUN_POS);

  const SHOULDER = (sx) => new THREE.Vector3(sx * 0.168, 1.462, 0.01);
  const UPPER = 0.285, FORE = 0.285;

  // Two-bone IK: given shoulder and target, find the elbow
  const solveElbow = (sh, tg, sx) => {
    const d = tg.clone().sub(sh);
    let dist = d.length();
    const maxD = UPPER + FORE - 1e-3;
    if (dist > maxD) { d.multiplyScalar(maxD / dist); dist = maxD; }
    const a = (UPPER * UPPER - FORE * FORE + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, UPPER * UPPER - a * a));
    const dir = d.clone().normalize();
    // Bend the elbow down and outward
    const out = new THREE.Vector3(sx * 0.85, -0.5, 0.16).normalize();
    const perp = out.clone().sub(dir.clone().multiplyScalar(out.dot(dir)));
    if (perp.lengthSq() < 1e-6) perp.set(sx, -1, 0);
    perp.normalize();
    return sh.clone().add(dir.multiplyScalar(a)).add(perp.multiplyScalar(h));
  };

  // A cylinder oriented to connect two points
  const bone = (from, to, r0, r1, mat) => {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const m = new THREE.Mesh(gCyl(r0, r1, len, 10), mat);
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  };

  // ---- Arms: upper arm and forearm both re-solve two-bone IK every frame against the gun ----
  // The arms used to be solved once at the gun's initial position and merged into static meshes, so the hands stayed put when the gun turned,
  // reading as the gun spinning inside two motionless hands. The shoulder is now a fixed anchor and elbow and wrist re-solve each frame.
  const upArmRoot = (sx) => {
    const g = new THREE.Group();
    const sh = SHOULDER(sx);
    g.add(part(gSph(0.062, 12, 10), cloth, sh.x, sh.y - 0.004, sh.z));
    bakeStatics(g, []);
    body.add(g);
    return g;
  };
  // The upper arm is a unit-length bone along +Y, stretched by scale.y to the real shoulder-to-elbow length
  const mkUpper = () => {
    const g = new THREE.Group();
    g.add(bone(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 0.058, 0.049, cloth));
    g.add(part(gSph(0.05, 12, 10), clothDark, 0, 1, 0));
    bakeStatics(g, []);
    body.add(g);
    return g;
  };
  const armL = [upArmRoot(-1), mkUpper()];
  const armR = [upArmRoot(1), mkUpper()];
  const upL = armL[1], upR = armR[1];

  // The forearm (glove included) is a local frame along +Y: origin at the elbow, +Y toward the wrist.
  // Re-solved and placed against the gun's live pose each time, so the hand always follows the gun.
  const mkFore = () => {
    const g = new THREE.Group();
    g.add(bone(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.285, 0), 0.048, 0.042, clothDark));
    g.add(part(gCyl(0.047, 0.047, 0.03, 10), webbing, 0, 0.237, 0));
    g.add(part(rBox(0.058, 0.070, 0.080, 0.62), leather, 0, 0.298, 0));
    for (let i = 0; i < 3; i++)
      g.add(part(gBox(0.052, 0.008, 0.011), leather, 0, 0.272 + i * 0.016, -0.036));
    bakeStatics(g, []);
    body.add(g);
    return g;
  };
  const foreL = mkFore();
  const foreR = mkFore();

  const _up = new THREE.Vector3(0, 1, 0);
  const _q = new THREE.Quaternion(), _tw = new THREE.Quaternion();
  const _wp = new THREE.Vector3(), _rx = new THREE.Vector3(), _ax = new THREE.Vector3();

  // Called each frame: re-solve two-bone IK from the gun's current body-local matrix (fixed shoulder, elbow, wrist).
  // So as the gun lifts, turns and sways, both arms follow and the hands stay attached to it.
  const updateArms = () => {
    const gm = gx0.matrix;
    const spec = [
      [-1, upL, foreL, -0.004, -0.014, -0.205],   // left hand on the handguard
      [1, upR, foreR, 0.004, -0.088, 0.115],      // right hand on the grip
    ];
    for (const [sx, ub, fb, lx, ly, lz] of spec) {
      const sh = SHOULDER(sx);
      _wp.set(lx, ly, lz).applyMatrix4(gm);        // gun-local to body-local
      const el = solveElbow(sh, _wp, sx);

      // Upper arm: shoulder to elbow
      _ax.copy(el).sub(sh);
      const upLen = _ax.length() || 1e-3;
      _ax.divideScalar(upLen);
      ub.position.copy(sh);
      ub.quaternion.setFromUnitVectors(_up, _ax);
      ub.scale.set(1, upLen, 1);

      // Forearm: elbow to wrist
      _ax.copy(_wp).sub(el);
      const foLen = _ax.length() || 1e-3;
      _ax.divideScalar(foLen);
      _q.setFromUnitVectors(_up, _ax);
      // Roll: face the glove's grip surface onto the gun's lateral axis (otherwise the wrist twists)
      _rx.set(1, 0, 0).transformDirection(gm);
      _rx.addScaledVector(_ax, -_rx.dot(_ax));
      if (_rx.lengthSq() > 1e-6) {
        _rx.normalize();
        const x0 = new THREE.Vector3(1, 0, 0).applyQuaternion(_q);
        const z0 = new THREE.Vector3().crossVectors(x0, _ax).normalize();
        _tw.setFromAxisAngle(_ax, -Math.atan2(_rx.dot(z0), _rx.dot(x0)));
        _q.premultiply(_tw);
      }
      fb.position.copy(el);
      fb.quaternion.copy(_q);
      fb.scale.set(1, foLen / 0.285, 1);
    }
  };
  const gx0 = gun;


  // Static parts (torso, vest, head, belt) merge by material; legs, forearms and gun stay separate
  bakeStatics(body, [legL, legR, armL[0], upL, armR[0], upR, foreL, foreR, gun]);

  // Overall size: slightly larger with a wider back, so it carries more visual weight
  body.scale.set(1.06, 1.05, 1.06);

  // Shadows
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  root.userData = {
    head, torso: chest, vest, legL, legR, armL, armR, body, gun,
    // Re-solve forearm IK against the gun's pose each frame (move the gun, the hands follow)
    updateArms,
    // Material set used for the hit flash
    flashMats: [cloth, clothDark, vestM],
  };
  return root;
}
