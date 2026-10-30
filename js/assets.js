// 程序化纹理与模型生成（无外部资源依赖）
import * as THREE from '../vendor/three.module.min.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const cvs = (size = 256) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
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
  // 大色块
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rnd(80, 130) | 0},${rnd(80, 128) | 0},${rnd(76, 120) | 0},.25)`;
    ctx.fillRect(rnd(0, size), rnd(0, size), rnd(20, 90), rnd(20, 90));
  }
  noise(ctx, size, 34);
  grunge(ctx, size, 60, 'rgba(40,40,38,ALPHA)', 26);
  grunge(ctx, size, 30, 'rgba(150,150,142,ALPHA)', 18);
  // 砖缝
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
  // 竖向加强筋
  for (let x = 0; x < size; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, 'rgba(0,0,0,.30)');
    g.addColorStop(.35, 'rgba(255,255,255,.10)');
    g.addColorStop(.7, 'rgba(255,255,255,.02)');
    g.addColorStop(1, 'rgba(0,0,0,.24)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 32, size);
  }
  // 锈斑
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
  // 木板缝
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

export function skyTexture() {
  const w = 64, h = 256, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3f7fc0');
  g.addColorStop(.34, '#79b0dd');
  g.addColorStop(.55, '#bcd4e6');
  g.addColorStop(.62, '#e8e2d2');
  g.addColorStop(.70, '#c7baa2');
  g.addColorStop(1, '#8c8574');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 淡淡的云带
  for (let i = 0; i < 60; i++) {
    const y = Math.random() * h * 0.45;
    ctx.fillStyle = `rgba(255,255,255,${(0.05 + Math.random() * 0.14).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * w, y, 8 + Math.random() * 30, 2 + Math.random() * 6, 0, 0, 7);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  return t;
}

// 枪口火焰贴图
export function flashTexture() {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,220,1)');
  g.addColorStop(.25, 'rgba(255,220,120,.95)');
  g.addColorStop(.55, 'rgba(255,140,40,.55)');
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  // 星形射线
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

// ---------------- 武器模型（第一人称，低模风格） ----------------
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

// 模型朝向：-Z 为枪口方向
export function buildRifle() {
  const g = new THREE.Group();
  const receiver = mat(0x4c5158, 0.5, 0.72);   // 冲压机匣钢
  const steel = mat(0x6f747c, 0.38, 0.85);     // 枪管/小件
  const dark = mat(0x34373c, 0.6, 0.55);       // 深色件
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a4c22, roughness: 0.5, metalness: 0.08 }); // 胡桃木
  const woodD = new THREE.MeshStandardMaterial({ color: 0x6f3a18, roughness: 0.55, metalness: 0.08 });
  const bakelite = new THREE.MeshStandardMaterial({ color: 0x9c4a1c, roughness: 0.42, metalness: 0.12 }); // 胶木弹匣

  // ---- 机匣（冲压钢 + 圆形防尘盖） ----
  g.add(box(0.075, 0.085, 0.34, receiver, 0, 0, 0.05));
  const dust = cyl(0.041, 0.041, 0.3, receiver, 14); // 半沉入机匣形成圆顶
  dust.rotation.x = Math.PI / 2; dust.position.set(0, 0.042, 0.04); g.add(dust);
  // 机匣前后的固定帽
  g.add(box(0.08, 0.095, 0.03, dark, 0, 0, -0.115));
  g.add(box(0.08, 0.09, 0.03, dark, 0, 0, 0.215));
  // 弹匣井
  g.add(box(0.062, 0.05, 0.075, dark, 0, -0.06, 0.03));
  // ---- 发射/快慢机与拉机柄（右侧细节） ----
  g.add(box(0.014, 0.016, 0.11, dark, 0.045, -0.005, 0.10));  // 快慢机柄
  const charge = cyl(0.011, 0.011, 0.045, steel, 8);          // 拉机柄
  charge.rotation.x = Math.PI / 2; charge.position.set(0.056, 0.028, 0.10); g.add(charge);

  // ---- 木质下护木 + 上护木/导气管 ----
  g.add(box(0.07, 0.055, 0.21, wood, 0, -0.012, -0.235));      // 下护木
  g.add(box(0.05, 0.028, 0.19, woodD, 0, 0.038, -0.225));      // 上护木
  const gasTube = cyl(0.013, 0.013, 0.2, steel, 8);            // 导气管
  gasTube.rotation.x = Math.PI / 2; gasTube.position.set(0, 0.058, -0.225); g.add(gasTube);

  // ---- 枪管 / 准星 / 斜切制退器 ----
  const barrel = cyl(0.0135, 0.0135, 0.27, steel, 10);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.018, -0.475); g.add(barrel);
  // 导气箍
  g.add(box(0.032, 0.05, 0.035, dark, 0, 0.03, -0.345));
  // 表尺座（弧形表尺）
  g.add(box(0.034, 0.028, 0.05, dark, 0, 0.058, -0.09));
  const leaf = box(0.026, 0.008, 0.075, steel, 0, 0.075, -0.06, -0.08);
  g.add(leaf);
  // 准星座 + 准星（带护圈两耳）
  g.add(box(0.03, 0.05, 0.032, dark, 0, 0.028, -0.575));
  g.add(box(0.012, 0.05, 0.012, dark, 0, 0.075, -0.575));
  g.add(box(0.008, 0.035, 0.01, dark, -0.019, 0.068, -0.575));
  g.add(box(0.008, 0.035, 0.01, dark, 0.019, 0.068, -0.575));
  g.add(box(0.006, 0.026, 0.006, steel, 0, 0.062, -0.575));    // 准星柱
  // 枪口斜切制退器（AKM 标志性斜切口）+ 枪口内膛
  const brake = cyl(0.0185, 0.0185, 0.062, dark, 12);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.018, -0.62); g.add(brake);
  const slant = box(0.036, 0.016, 0.032, dark, 0, 0.03, -0.648, 0.5);
  g.add(slant);
  const muzIn = cyl(0.0095, 0.0095, 0.03, mat(0x08090b, 0.95, 0.2), 10);
  muzIn.rotation.x = Math.PI / 2; muzIn.position.set(0, 0.018, -0.648); g.add(muzIn);

  // ---- 弯曲"香蕉"弹匣（胶木，三段渐进前弯） ----
  g.add(box(0.054, 0.135, 0.08, bakelite, 0, -0.135, 0.012, 0.16));
  g.add(box(0.052, 0.115, 0.075, bakelite, 0, -0.245, -0.03, 0.42));
  g.add(box(0.05, 0.1, 0.07, bakelite, 0, -0.34, -0.105, 0.68));
  g.add(box(0.053, 0.016, 0.073, dark, 0, -0.39, -0.158, 0.75)); // 弹匣底板
  g.add(box(0.058, 0.008, 0.012, dark, 0, -0.19, 0.038, 0.3));   // 加强筋
  g.add(box(0.058, 0.008, 0.012, dark, 0, -0.3, -0.06, 0.55));

  // ---- 握把（木制，后倾） + 扳机护圈 ----
  g.add(box(0.042, 0.125, 0.055, woodD, 0, -0.105, 0.15, -0.45));
  g.add(box(0.012, 0.01, 0.075, dark, 0, -0.078, 0.085));      // 护圈下缘
  g.add(box(0.012, 0.045, 0.01, dark, 0, -0.052, 0.048));      // 护圈前柱
  g.add(box(0.012, 0.038, 0.01, dark, 0, -0.05, 0.122));       // 护圈后柱
  g.add(box(0.012, 0.04, 0.01, steel, 0, -0.055, 0.085, 0.12));// 扳机

  // ---- 枪托（木质，向托底渐宽，带贴腮斜面与金属托底板） ----
  g.add(box(0.04, 0.052, 0.1, wood, 0, -0.012, 0.265));            // 托颈
  g.add(box(0.044, 0.072, 0.15, wood, 0, -0.022, 0.375));          // 托身
  g.add(box(0.046, 0.03, 0.1, wood, 0, 0.026, 0.3, 0.06));         // 贴腮斜面
  g.add(box(0.048, 0.092, 0.016, dark, 0, -0.03, 0.452, -0.03));   // 托底板
  // 托与机匣连接销
  const pin = cyl(0.008, 0.008, 0.072, steel, 6);
  pin.rotation.z = Math.PI / 2; pin.position.set(0, -0.026, 0.222); g.add(pin);

  // 持枪手臂（前手扶护木、后手握把，袖管比例自然）
  addArms(g, { front: [0.005, -0.085, -0.28], frontLen: 0.3, hand: 'grip', rear: [0, 0.0, 0.4] });

  g.traverse((o) => { o.castShadow = true; });
  return g;
}

function addArms(g, opt) {
  const glove = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.85, metalness: 0.1 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x4f5745, roughness: 0.95, metalness: 0.02 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb98a68, roughness: 0.85 });

  // 前手（托住护木下方）：手掌包住护木，手指朝右
  const fh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.1), glove);
  fh.position.set(opt.front[0], opt.front[1], opt.front[2]);
  g.add(fh);
  const fthumb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.05), glove);
  fthumb.position.set(opt.front[0] + 0.036, opt.front[1] + 0.028, opt.front[2] - 0.012);
  g.add(fthumb);
  // 露出的手腕
  const fw = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.06, 0.05), skinMat);
  fw.position.set(opt.front[0] - 0.006, opt.front[1] - 0.03, opt.front[2] + 0.075);
  g.add(fw);
  // 袖口
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.082, 0.03), glove);
  cuff.position.set(opt.front[0] - 0.012, opt.front[1] - 0.045, opt.front[2] + 0.1);
  cuff.rotation.x = -0.22;
  g.add(cuff);
  // 前臂袖子（向后下方延伸）
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.076, opt.frontLen), sleeve);
  fl.position.set(opt.front[0] - 0.022, opt.front[1] - 0.075, opt.front[2] + opt.frontLen / 2 + 0.115);
  fl.rotation.x = -0.26; fl.rotation.z = -0.08;
  g.add(fl);

  // 后手（握把）：绕握把包住
  const rh = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.08, 0.088), glove);
  rh.position.set(0, -0.105, 0.15); rh.rotation.x = -0.42;
  g.add(rh);
  const rthumb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.026, 0.062), glove);
  rthumb.position.set(-0.036, -0.075, 0.13); rthumb.rotation.x = -0.42;
  g.add(rthumb);
  // 手腕
  const rw = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.064, 0.05), skinMat);
  rw.position.set(0, -0.158, 0.208); rw.rotation.x = -0.5;
  g.add(rw);
  // 后臂袖子
  const rl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.086, 0.28), sleeve);
  rl.position.set(0.014, -0.232, 0.35); rl.rotation.x = 0.42; rl.rotation.z = 0.09;
  g.add(rl);
}

export function buildPistol() {
  // ---- Desert Eagle .50AE：固定枪管 + 大型套筒 + 粗壮握把 ----
  const g = new THREE.Group();
  const slide = mat(0x596068, 0.4, 0.86);    // 不锈钢套筒
  const slideD = mat(0x40454c, 0.44, 0.82);  // 套筒侧壁
  const dark = mat(0x24272b, 0.56, 0.7);     // 发黑小件
  const frame = mat(0x3a3e44, 0.5, 0.78);    // 下机匣
  const gripM = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.82, metalness: 0.14 });
  const steel = mat(0x828790, 0.3, 0.9);

  // ---- 套筒主体：前段窄（护住固定枪管）、后段宽（容纳枪机） ----
  g.add(box(0.07, 0.056, 0.175, slide, 0, 0.004, 0.1));    // 后段宽套筒
  g.add(box(0.062, 0.05, 0.155, slide, 0, 0.002, -0.06));   // 前段套筒
  // 套筒两侧下缘斜面（Deagle 的梯形断面）
  for (const sx of [-1, 1]) {
    g.add(box(0.008, 0.02, 0.3, slideD, sx * 0.036, -0.012, 0.01, 0, 0, sx * 0.35));
  }
  // 后段防滑纹
  for (let i = 0; i < 6; i++) g.add(box(0.074, 0.042, 0.0055, dark, 0, 0.004, 0.15 + i * 0.0115));
  // 前段泄气槽
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++)
    g.add(box(0.0035, 0.012, 0.026, dark, sx * 0.0315, 0.014, -0.09 - i * 0.03));

  // ---- 固定枪管（.50 大口径，露出于套筒之前） ----
  const barrel = cyl(0.0235, 0.0235, 0.13, slide, 14);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.012, -0.185); g.add(barrel);
  // 枪管顶部平台
  g.add(box(0.03, 0.014, 0.13, slide, 0, 0.033, -0.185));
  // 枪口 + 内膛
  const bore = cyl(0.0245, 0.0245, 0.022, steel, 14);
  bore.rotation.x = Math.PI / 2; bore.position.set(0, 0.012, -0.252); g.add(bore);
  const boreIn = cyl(0.0175, 0.0175, 0.03, mat(0x08090b, 0.95, 0.2), 12);
  boreIn.rotation.x = Math.PI / 2; boreIn.position.set(0, 0.012, -0.256); g.add(boreIn);

  // ---- 顶部瞄准肋条（Deagle 标志性的锯齿散热肋） ----
  g.add(box(0.024, 0.012, 0.235, steel, 0, 0.042, -0.075));
  for (let i = 0; i < 8; i++) g.add(box(0.028, 0.006, 0.014, dark, 0, 0.05, -0.17 + i * 0.024));
  // 前准星 / 后照门（梯形，两片）
  g.add(box(0.01, 0.024, 0.016, dark, 0, 0.056, -0.228));
  g.add(box(0.026, 0.012, 0.014, dark, 0, 0.048, 0.172));
  for (const sx of [-1, 1]) g.add(box(0.008, 0.02, 0.012, dark, sx * 0.014, 0.056, 0.172));

  // ---- 下机匣 / 扳机护圈 ----
  g.add(box(0.054, 0.042, 0.22, frame, 0, -0.036, 0.03));
  g.add(box(0.014, 0.011, 0.088, frame, 0, -0.083, -0.014));   // 护圈下缘
  g.add(box(0.014, 0.046, 0.012, frame, 0, -0.06, -0.056));    // 护圈前柱
  g.add(box(0.014, 0.044, 0.012, frame, 0, -0.058, 0.028));    // 护圈后柱
  g.add(box(0.011, 0.042, 0.011, steel, 0, -0.056, -0.014, 0.14)); // 扳机
  // 滑套卡榫 / 保险
  g.add(box(0.008, 0.014, 0.03, dark, 0.036, -0.008, 0.06));
  g.add(box(0.008, 0.012, 0.026, dark, -0.036, 0.006, 0.14));

  // ---- 握把（粗壮，指槽 + 侧板） ----
  g.add(box(0.048, 0.155, 0.072, gripM, 0, -0.132, 0.108, -0.3));
  g.add(box(0.054, 0.1, 0.046, dark, 0, -0.132, 0.114, -0.3));    // 侧板
  for (let i = 0; i < 3; i++)                                     // 指槽
    g.add(box(0.052, 0.007, 0.058, dark, 0, -0.075 - i * 0.032, 0.09 + i * 0.011, -0.3));
  g.add(box(0.058, 0.046, 0.082, frame, 0, -0.056, 0.148, -0.1)); // 握把与机匣过渡
  g.add(box(0.052, 0.026, 0.046, frame, 0, 0.004, 0.196, -0.14)); // 海狸尾
  g.add(box(0.05, 0.014, 0.03, gripM, 0, -0.212, 0.148, -0.3));   // 弹匣底板

  // ---- 击锤（外露，后倾） ----
  g.add(box(0.014, 0.03, 0.014, steel, 0, 0.036, 0.198, -0.42));
  g.add(box(0.02, 0.012, 0.012, steel, 0, 0.05, 0.186, -0.42));

  // ---- 双手（右手握把 + 左手包覆，手臂） ----
  const glove = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.85 });
  const gloveL = new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.85 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x5d6650, roughness: 0.95 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98a68, roughness: 0.85 });
  // 右手（主手，包住握把）
  const hd = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.105, 0.1), glove);
  hd.position.set(0.004, -0.115, 0.108); hd.rotation.x = -0.3; g.add(hd);
  const rthumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.03), glove);
  rthumb.position.set(-0.035, -0.085, 0.088); rthumb.rotation.x = -0.35; g.add(rthumb);
  // 左手（副手，从左侧包覆）
  const hd2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.108, 0.098), gloveL);
  hd2.position.set(-0.042, -0.135, 0.115); hd2.rotation.x = -0.3; hd2.rotation.z = 0.1; g.add(hd2);
  const lthumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.026, 0.062), gloveL);
  lthumb.position.set(-0.03, -0.072, 0.075); lthumb.rotation.x = -0.3; g.add(lthumb);
  // 手腕
  const wr = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.068, 0.048), skin);
  wr.position.set(-0.014, -0.185, 0.182); wr.rotation.x = -0.42; g.add(wr);
  // 小臂（向后下方）
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.104, 0.26), sleeve);
  sl.position.set(-0.028, -0.245, 0.3); sl.rotation.x = 0.46; sl.rotation.z = -0.12; g.add(sl);

  g.traverse((o) => { o.castShadow = true; });
  return g;
}

// ---------------- 敌方角色（细节化士兵） ----------------
// 几何体复用缓存：多个敌人共享同一 geometry，减少内存与 GC
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

// 简易部件：位置 + 旋转 + 缩放一次写完
function part(geo, material, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  return m;
}

/**
 * 构建敌方士兵模型。
 * @param {number} color  军装主色（不同精英等级换色）
 * @param {number} skin   肤色
 * @param {object} opt    { elite:boolean, helmet:'full'|'cap', visorColor }
 */
export function buildSoldier(color = 0xb03a3a, skin = 0xd0a07a, opt = {}) {
  const elite = !!opt.elite;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // ---- 材质 ----
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.04 });
  const clothDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.72).getHex(), roughness: 0.9, metalness: 0.04,
  });
  const pad = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.78, metalness: 0.22 });
  const vestM = new THREE.MeshStandardMaterial({ color: elite ? 0x2b2f36 : 0x3a3e45, roughness: 0.9, metalness: 0.1 });
  const webbing = new THREE.MeshStandardMaterial({ color: 0x4a4a3e, roughness: 0.95, metalness: 0.02 });
  const skinc = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.82, metalness: 0.02 });
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

  // ---- 骨盆 / 腰带 ----
  body.add(part(gBox(0.38, 0.19, 0.23), clothDark, 0, 0.88, 0));
  body.add(part(gBox(0.4, 0.055, 0.25), leather, 0, 0.965, 0));            // 腰带
  body.add(part(gBox(0.06, 0.05, 0.03), accentMat, 0, 0.965, -0.128));     // 皮带扣
  // 腰侧挂包
  body.add(part(gBox(0.09, 0.1, 0.07), webbing, -0.2, 0.93, -0.06, 0, 0.2, 0));
  body.add(part(gBox(0.08, 0.09, 0.06), webbing, 0.2, 0.93, -0.05, 0, -0.2, 0));
  // 水壶
  body.add(part(gCyl(0.042, 0.042, 0.13, 8), pad, 0.21, 0.9, 0.11, 0, 0, 0.1));
  // 匕首鞘
  body.add(part(gBox(0.035, 0.16, 0.05), leather, -0.21, 0.86, 0.09, 0.12, 0, 0.15));

  // ---- 躯干（三段收腰，更接近人体） ----
  const torso = part(gBox(0.42, 0.24, 0.235), cloth, 0, 1.1, 0);
  body.add(torso);
  const chest = part(gBox(0.475, 0.27, 0.25), cloth, 0, 1.34, 0);
  body.add(chest);
  // 斜挎背带（视觉层次）
  body.add(part(gBox(0.055, 0.42, 0.03), webbing, -0.1, 1.3, -0.135, 0, 0, 0.42));
  body.add(part(gBox(0.055, 0.4, 0.03), webbing, 0.13, 1.28, -0.132, 0, 0, -0.36));

  // ---- 战术背心 ----
  const vest = part(gBox(0.44, 0.44, 0.29), vestM, 0, 1.24, 0);
  body.add(vest);
  // 前胸弹匣袋（3 个，带扣盖）
  for (let i = -1; i <= 1; i++) {
    const dx = i * 0.13;
    body.add(part(gBox(0.1, 0.12, 0.055), pad, dx, 1.15, -0.165));
    body.add(part(gBox(0.104, 0.032, 0.062), webbing, dx, 1.2, -0.167));   // 袋盖
    body.add(part(gBox(0.02, 0.02, 0.012), accentMat, dx, 1.175, -0.196)); // 按扣
  }
  // 无线电（左胸）
  body.add(part(gBox(0.085, 0.13, 0.06), pad, -0.16, 1.36, -0.135));
  body.add(part(gCyl(0.006, 0.006, 0.14, 6), metal, -0.175, 1.47, -0.14, 0.16, 0, 0.1)); // 天线
  // 护板 / 魔术贴标识
  body.add(part(gBox(0.12, 0.028, 0.015), accentMat, 0.14, 1.4, -0.146));
  // 肩带
  body.add(part(gBox(0.09, 0.06, 0.28), vestM, -0.17, 1.48, 0));
  body.add(part(gBox(0.09, 0.06, 0.28), vestM, 0.17, 1.48, 0));
  // 背部电台 + 背包
  const pack = part(gBox(0.28, 0.29, 0.13), pad, 0, 1.32, 0.185);
  body.add(pack);
  body.add(part(gBox(0.26, 0.06, 0.142), webbing, 0, 1.22, 0.185));   // 背包绑带
  body.add(part(gBox(0.11, 0.14, 0.05), vestM, 0, 1.44, 0.255));       // 外挂杂物包
  body.add(part(gCyl(0.005, 0.005, 0.16, 6), metal, 0.11, 1.55, 0.2, 0.12, 0, -0.12)); // 天线
  // 背包侧挂（卷起的睡袋）
  body.add(part(gCyl(0.045, 0.045, 0.22, 8), webbing, -0.15, 1.3, 0.2, 0, 0, Math.PI / 2));

  // ---- 肩部装甲 + 臂章 ----
  const shoulderG = gSph(0.105, 10, 8);
  const sL = part(shoulderG, pad, -0.255, 1.45, 0, 0, 0, 0, 1, 0.85, 1.05);
  const sR = part(shoulderG, pad, 0.255, 1.45, 0, 0, 0, 0, 1, 0.85, 1.05);
  body.add(sL, sR);
  // 肩垫下层（布质）
  body.add(part(gSph(0.115, 10, 8), cloth, -0.25, 1.4, 0, 0, 0, 0, 1, 0.7, 1));
  body.add(part(gSph(0.115, 10, 8), cloth, 0.25, 1.4, 0, 0, 0, 0, 1, 0.7, 1));
  // 臂章（左右各一块，精英为金色）
  body.add(part(gBox(0.012, 0.07, 0.07), accentMat, -0.31, 1.32, 0));
  body.add(part(gBox(0.012, 0.06, 0.06), accentMat, 0.31, 1.34, 0.02));

  // ---- 颈部 / 头 ----
  body.add(part(gCyl(0.058, 0.072, 0.09, 8), skinc, 0, 1.52, 0));
  const head = part(gSph(0.118, 14, 12), skinc, 0, 1.625, 0, 0, 0, 0, 1, 1.06, 1);
  body.add(head);
  // 下颌（让头型不那么像球）
  body.add(part(gBox(0.13, 0.06, 0.1), skinc, 0, 1.55, -0.045));
  // 耳朵
  body.add(part(gSph(0.028, 6, 5), skinc, -0.115, 1.63, 0.005, 0, 0, 0, 0.6, 1, 1));
  body.add(part(gSph(0.028, 6, 5), skinc, 0.115, 1.63, 0.005, 0, 0, 0, 0.6, 1, 1));

  // 头盔（半球 + 帽檐 + 侧导轨 + 头盔带）
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.138, 16, 11, 0, Math.PI * 2, 0, Math.PI * 0.56), pad
  );
  helmet.position.set(0, 1.632, 0);
  helmet.scale.set(1.02, 1.06, 1.04);
  body.add(helmet);
  // 头盔顶盖 / 加强筋
  body.add(part(gBox(0.045, 0.026, 0.2), vestM, 0, 1.755, 0));
  body.add(part(gBox(0.2, 0.026, 0.045), vestM, 0, 1.752, 0));
  // 侧导轨
  body.add(part(gBox(0.022, 0.032, 0.13), metal, -0.132, 1.66, -0.02));
  body.add(part(gBox(0.022, 0.032, 0.13), metal, 0.132, 1.66, -0.02));
  // 头盔下缘带
  body.add(part(gBox(0.29, 0.028, 0.29), vestM, 0, 1.585, 0));
  // 前额夜视镜座
  body.add(part(gBox(0.07, 0.05, 0.05), metal, 0, 1.72, -0.115));
  // 护目镜（双镜片 + 镜框）
  body.add(part(gBox(0.2, 0.05, 0.055), vestM, 0, 1.645, -0.108));
  body.add(part(gBox(0.075, 0.038, 0.02), glass, -0.048, 1.646, -0.13));
  body.add(part(gBox(0.075, 0.038, 0.02), glass, 0.048, 1.646, -0.13));
  // 镜带
  body.add(part(gBox(0.3, 0.03, 0.02), vestM, 0, 1.645, 0.11));
  // 面罩（半脸）
  const mask = part(gBox(0.145, 0.09, 0.075), pad, 0, 1.565, -0.075);
  body.add(mask);
  body.add(part(gBox(0.14, 0.05, 0.02), leather, 0, 1.52, -0.085)); // 面罩下缘
  // 呼吸滤罐
  body.add(part(gCyl(0.032, 0.032, 0.04, 8), metal, 0, 1.53, -0.105, Math.PI / 2, 0, 0));
  // 通讯耳麦
  body.add(part(gCyl(0.038, 0.038, 0.024, 10), pad, -0.122, 1.63, 0, 0, 0, Math.PI / 2));
  body.add(part(gCyl(0.038, 0.038, 0.024, 10), pad, 0.122, 1.63, 0, 0, 0, Math.PI / 2));
  // 麦克风杆
  body.add(part(gBox(0.014, 0.014, 0.1), leather, -0.1, 1.575, -0.075, 0.3, -0.5, 0));

  // ---- 腿（髋关节组，带大腿/小腿/护膝/战术靴，可动画） ----
  const mkLeg = (sx) => {
    const g = new THREE.Group();
    g.position.set(sx, 0.87, 0);
    // 大腿
    g.add(part(gBox(0.155, 0.42, 0.175), cloth, 0, -0.21, 0));
    // 大腿侧袋
    g.add(part(gBox(0.045, 0.13, 0.1), webbing, sx > 0 ? 0.085 : -0.085, -0.2, -0.01));
    // 小腿（靴筒）
    g.add(part(gBox(0.14, 0.36, 0.16), clothDark, 0, -0.58, 0.008));
    // 护膝
    g.add(part(gBox(0.148, 0.11, 0.075), pad, 0, -0.44, -0.088));
    g.add(part(gBox(0.1, 0.03, 0.02), accentMat, 0, -0.44, -0.128));
    // 绑腿
    g.add(part(gBox(0.146, 0.035, 0.166), leather, 0, -0.5, 0.008));
    g.add(part(gBox(0.142, 0.03, 0.162), leather, 0, -0.68, 0.008));
    // 靴子（鞋身 + 鞋头 + 鞋底 + 鞋带）
    g.add(part(gBox(0.15, 0.115, 0.19), leather, 0, -0.79, 0.005));
    g.add(part(gBox(0.14, 0.085, 0.09), leather, 0, -0.805, -0.115));
    g.add(part(gBox(0.158, 0.032, 0.3), new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.98 }), 0, -0.852, -0.02));
    g.add(part(gBox(0.155, 0.016, 0.1), pad, 0, -0.755, -0.045));
    body.add(g);
    return g;
  };
  const legL = mkLeg(-0.115), legR = mkLeg(0.115);

  // ---- 手臂（肩关节组，持枪姿态） ----
  const mkArm = (sx) => {
    const g = new THREE.Group();
    g.position.set(sx, 1.43, 0);
    // 上臂（略向外、向前）
    g.add(part(gBox(0.1, 0.28, 0.11), cloth, sx * 0.1, -0.14, -0.05, 0.55, 0, 0));
    // 肘部护具
    g.add(part(gBox(0.098, 0.068, 0.085), pad, sx * 0.12, -0.275, -0.135, 0.55, 0, 0));
    // 小臂（前伸指向 -Z）
    g.add(part(gBox(0.088, 0.25, 0.095), clothDark, sx * 0.14, -0.325, -0.285, 1.42, 0, 0));
    // 手套
    g.add(part(gBox(0.076, 0.076, 0.095), leather, sx * 0.15, -0.35, -0.44));
    // 手腕护条
    g.add(part(gBox(0.082, 0.026, 0.082), pad, sx * 0.145, -0.345, -0.385));
    body.add(g);
    return g;
  };
  const armL = mkArm(-0.275), armR = mkArm(0.275);

  // ---- 步枪（细节化：机匣/护木/弯弹匣/准星/枪托/握把/瞄具） ----
  const gun = new THREE.Group();
  gun.add(part(gBox(0.055, 0.075, 0.44), gunMat, 0, 0, 0));                        // 机匣
  gun.add(part(gBox(0.05, 0.032, 0.34), metal, 0, 0.052, -0.03));                  // 上机匣盖
  gun.add(part(gBox(0.048, 0.07, 0.17), pad, 0, 0.005, -0.245));                   // 护木
  gun.add(part(gCyl(0.014, 0.014, 0.24, 8), metal, 0, 0.022, -0.4, Math.PI / 2, 0, 0)); // 枪管
  gun.add(part(gCyl(0.021, 0.021, 0.055, 8), gunMat, 0, 0.022, -0.5, Math.PI / 2, 0, 0)); // 消焰器
  gun.add(part(gBox(0.026, 0.05, 0.022), gunMat, 0, 0.072, -0.44));                // 准星
  gun.add(part(gBox(0.02, 0.028, 0.018), gunMat, 0, 0.06, 0.08));                  // 照门
  gun.add(part(gBox(0.038, 0.045, 0.05), metal, 0, 0.085, -0.16));                 // 光学瞄具
  // 弯弹匣（两段）
  gun.add(part(gBox(0.042, 0.15, 0.075), gunMat, 0, -0.11, 0.03, 0.22, 0, 0));
  gun.add(part(gBox(0.04, 0.1, 0.068), gunMat, 0, -0.2, 0.075, 0.55, 0, 0));
  // 握把
  gun.add(part(gBox(0.042, 0.13, 0.06), pad, 0, -0.095, 0.16, -0.3, 0, 0));
  // 枪托
  gun.add(part(gBox(0.045, 0.075, 0.22), pad, 0, -0.01, 0.32));
  gun.add(part(gBox(0.05, 0.1, 0.028), gunMat, 0, -0.02, 0.44));
  gun.position.set(0.055, 1.235, -0.34);
  gun.rotation.set(-0.09, -0.16, 0.06);
  body.add(gun);
  // 枪背带
  body.add(part(gBox(0.03, 0.28, 0.02), leather, 0.1, 1.32, -0.145, 0, 0, -0.4));

  // 阴影
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  root.userData = {
    head, torso: chest, vest, legL, legR, armL, armR, body, gun,
    // 用于受击闪红的材质集合
    flashMats: [cloth, clothDark, vestM],
  };
  return root;
}
