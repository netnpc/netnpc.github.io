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

// 程序化天空球：渐变 + 云，用 512 宽贴图，避免低分辨率在球面上拉伸出色带/黑块
export function skyTexture() {
  const w = 1024, h = 512, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  // 竖直渐变：天顶深蓝 → 地平线雾色
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.00, '#2f6fb5');
  g.addColorStop(0.18, '#4d8fd0');
  g.addColorStop(0.34, '#7ab3de');
  g.addColorStop(0.46, '#a8cbe6');
  g.addColorStop(0.50, '#c8dbea');   // 地平线
  g.addColorStop(0.56, '#b7b6ad');
  g.addColorStop(0.72, '#8d8878');
  g.addColorStop(1.00, '#6d6a5e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // 高空细云（多层，横向拉伸，只出现在天空上半部）
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
  // 地平线附近的雾带（让天地接缝自然）
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
  const receiver = mat(0x5f646b, 0.46, 0.74);   // 冲压机匣（钢灰，避免反射出天蓝色）
  const steel = mat(0x7c828b, 0.34, 0.8);      // 枪管/小件
  const dark = mat(0x3d4046, 0.56, 0.62);      // 深色件
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a5a28, roughness: 0.5, metalness: 0.08 }); // 胡桃木
  const woodD = new THREE.MeshStandardMaterial({ color: 0x7d4620, roughness: 0.55, metalness: 0.08 });
  const bakelite = new THREE.MeshStandardMaterial({ color: 0xa5541f, roughness: 0.4, metalness: 0.14 }); // 胶木弹匣

  // ---- 机匣（冲压钢 + 圆形防尘盖） ----
  g.add(box(0.068, 0.078, 0.34, receiver, 0, 0, 0.05));
  const dust = cyl(0.039, 0.039, 0.3, mat(0x555a61, 0.5, 0.68), 14); // 半沉入机匣形成圆顶
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
  g.add(box(0.05, 0.135, 0.074, bakelite, 0, -0.135, 0.012, 0.16));
  g.add(box(0.048, 0.115, 0.07, bakelite, 0, -0.245, -0.03, 0.42));
  g.add(box(0.046, 0.1, 0.066, bakelite, 0, -0.34, -0.105, 0.68));
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
  // 枪管轴线锚点：用于让准星与枪口方向对齐（x=0 为枪管中心线，勿加横向偏移）
  g.userData.axis = { x: 0, y: 0.018, z: -0.648, rear: -0.06 };
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
  // ---- M1911A1 风格半自动手枪 ----
  // 上一版的问题：套筒顶面是一条高光白条（顶面材质太亮太窄），
  // 侧面几乎是纯平的黑板，握把又被手盖住，整体像玩具积木。
  // 这版按真实 M1911 的比例与断面做：
  //   套筒 = 上宽下窄的长方体 + 45° 倒角棱（高光落在棱线上，而不是一整条顶面）；
  //   下机匣在扳机护圈前是"尘土罩"短段，护圈圆润、扳机是弧形片；
  //   握把 17° 后倾，两片胡桃木握片留出金属边，能看到防滑纹。
  const g = new THREE.Group();

  // ---- 材质：全部走"哑光金属 + 棱线高光"，避免整条白亮带 ----
  const steel = new THREE.MeshStandardMaterial({ color: 0x8f969f, roughness: 0.34, metalness: 0.9 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x5a616a, roughness: 0.44, metalness: 0.86 });
  const parkerized = new THREE.MeshStandardMaterial({ color: 0x596069, roughness: 0.6, metalness: 0.68 });
  const black = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.62, metalness: 0.5 });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x53301a, roughness: 0.58, metalness: 0.04 });
  const walnutDark = new THREE.MeshStandardMaterial({ color: 0x3c2011, roughness: 0.62, metalness: 0.03 });
  const bore = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.98, metalness: 0.1 });

  // 楔形（梯形断面）块：用来做套筒的倒角棱，比纯 Box 有型
  const wedge = (w0, w1, h, d, m, x, y, z) => {
    const geo = new THREE.BufferGeometry();
    const hw0 = w0 / 2, hw1 = w1 / 2, hd = d / 2, hh = h / 2;
    const v = [
      // 顶面（窄） 0-3
      -hw1, hh, -hd, hw1, hh, -hd, hw1, hh, hd, -hw1, hh, hd,
      // 底面（宽） 4-7
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

  const SLD_Y = 0.030;       // 套筒中心高度
  const SLD_L = 0.300;       // 套筒长度
  // ============ 套筒 ============
  // 主体：上窄下宽的梯形断面（真实 1911 套筒就是这个形状）
  g.add(wedge(0.050, 0.038, 0.052, SLD_L, steelDark, 0, SLD_Y, 0.010));
  // 两侧的纵向棱线（一条细窄的抛光面，让高光是"一条线"而不是"一整面"）
  for (const sx of [-1, 1]) {
    g.add(box(0.0035, 0.010, SLD_L * 0.92, steel, sx * 0.0245, SLD_Y + 0.006, 0.010));
  }
  // 顶面正中的狭窄光条：用略亮的中灰而非高光钢，开镜时不会变成一条白带
  const topTone = new THREE.MeshStandardMaterial({ color: 0x6e757e, roughness: 0.5, metalness: 0.8 });
  g.add(box(0.013, 0.0022, SLD_L * 0.9, topTone, 0, SLD_Y + 0.0265, 0.010));
  // 前后端面（收口）
  g.add(box(0.050, 0.046, 0.008, black, 0, SLD_Y, -0.142));
  g.add(box(0.052, 0.050, 0.010, black, 0, SLD_Y, 0.152));
  // 后段的斜向防滑纹（1911 标志性的竖棱）
  for (let i = 0; i < 9; i++) {
    for (const sx of [-1, 1]) {
      g.add(box(0.004, 0.040, 0.0055, black, sx * 0.0248, SLD_Y + 0.001, 0.098 + i * 0.0085, 0, 0, 0));
    }
  }
  // 抛壳口（右侧）
  g.add(box(0.004, 0.022, 0.062, bore, 0.0252, SLD_Y + 0.008, 0.045));
  // 套筒前后各一道细槽（分件感）
  g.add(box(0.046, 0.004, 0.004, black, 0, SLD_Y + 0.020, -0.055));
  g.add(box(0.046, 0.004, 0.004, black, 0, SLD_Y + 0.020, 0.115));

  // ============ 枪口 / 枪管 / 膛线 ============
  // 1911 的 5 英寸枪管略短于套筒，枪口带一圈阳膛
  const crown = cyl(0.0125, 0.0125, 0.014, steel, 16);
  crown.rotation.x = Math.PI / 2; crown.position.set(0, SLD_Y + 0.002, -0.148);
  g.add(crown);
  const boreIn = cyl(0.0082, 0.0082, 0.05, bore, 14);
  boreIn.rotation.x = Math.PI / 2; boreIn.position.set(0, SLD_Y + 0.002, -0.140);
  g.add(boreIn);
  // 套筒前端的衬套（bushing，1911 的辨识特征）
  const bush = cyl(0.0165, 0.0165, 0.012, parkerized, 16);
  bush.rotation.x = Math.PI / 2; bush.position.set(0, SLD_Y + 0.002, -0.134);
  g.add(bush);

  // ============ 下机匣 ============
  const FRM_Y = -0.008;
  g.add(box(0.044, 0.030, 0.250, parkerized, 0, FRM_Y, 0.010));       // 机匣本体
  g.add(box(0.042, 0.012, 0.095, parkerized, 0, FRM_Y - 0.014, -0.098)); // 尘土罩（护圈前段）
  // 机匣与套筒之间的导轨线
  for (const sx of [-1, 1])
    g.add(box(0.0025, 0.005, 0.245, black, sx * 0.0222, FRM_Y + 0.013, 0.010));

  // ============ 扳机护圈（弧形）============
  // 用几段小方块拼出圆弧，比单个直方块自然得多
  const guardSeg = 9;
  for (let i = 0; i <= guardSeg; i++) {
    const a = Math.PI * (0.06 + 0.88 * i / guardSeg);      // 前下后扫过
    const r = 0.036;
    const cx = 0, cy = FRM_Y - 0.016, cz = -0.030;
    const px = 0;
    const py = cy - Math.sin(a) * r;
    const pz = cz - Math.cos(a) * r;
    const seg = box(0.011, 0.0075, 0.011, parkerized, px, py, pz, a + Math.PI / 2, 0, 0);
    g.add(seg);
  }
  // 护圈前端与机匣的过渡
  g.add(box(0.011, 0.020, 0.012, parkerized, 0, FRM_Y - 0.020, -0.066));
  // 扳机（弧形片）
  g.add(box(0.010, 0.030, 0.007, steelDark, 0, FRM_Y - 0.018, -0.016, 0.16));
  g.add(box(0.008, 0.008, 0.006, black, 0, FRM_Y - 0.034, -0.014, 0.16));

  // ============ 握把（17° 后倾）============
  const GA = -0.30;
  // 握把骨架（金属，比木片略小，木片贴上去后四周露出金属边）
  g.add(box(0.042, 0.150, 0.078, parkerized, 0, -0.100, 0.112, GA));
  // 两片胡桃木握片
  for (const sx of [-1, 1]) {
    g.add(box(0.0065, 0.126, 0.062, walnut, sx * 0.0245, -0.104, 0.112, GA));
    // 木片上的菱格防滑纹（三道浅槽，斜向）
    for (let i = 0; i < 3; i++)
      g.add(box(0.0012, 0.006, 0.050, walnutDark, sx * 0.0282, -0.062 - i * 0.026, 0.112, GA));
    // 木片的固定螺丝（横向，贴着木片表面）
    const screw = cyl(0.0045, 0.0045, 0.0035, steel, 8);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(sx * 0.0292, -0.100, 0.112);
    g.add(screw);
  }
  // 握把前缘的指槽
  for (let i = 0; i < 3; i++)
    g.add(box(0.044, 0.004, 0.048, black, 0, -0.052 - i * 0.028, 0.088 + i * 0.008, GA));
  // 主弹簧housing（握把后下方的鼓包）+ 弹匣底板
  g.add(box(0.048, 0.034, 0.072, parkerized, 0, -0.048, 0.146, -0.12));
  g.add(box(0.046, 0.016, 0.062, black, 0, -0.176, 0.150, GA));
  // 海狸尾（击锤下方的护手）
  g.add(box(0.048, 0.014, 0.052, steelDark, 0, 0.014, 0.158, -0.18));

  // ============ 控制件 ============
  // 击锤（后倾，带击锤簧）
  g.add(box(0.012, 0.030, 0.012, steelDark, 0, SLD_Y + 0.030, 0.172, -0.55));
  g.add(box(0.018, 0.008, 0.010, steel, 0, SLD_Y + 0.044, 0.166, -0.55));
  // 保险（左侧的小拨片）
  g.add(box(0.006, 0.010, 0.026, steelDark, -0.024, FRM_Y + 0.012, 0.104, 0, 0, 0));
  // 空仓挂机杆
  g.add(box(0.005, 0.007, 0.032, steel, -0.0235, FRM_Y + 0.018, 0.020));
  // 弹匣扣
  const magBtn = cyl(0.005, 0.005, 0.006, black, 8);
  magBtn.rotation.z = Math.PI / 2;
  magBtn.position.set(-0.024, FRM_Y - 0.012, -0.010);
  g.add(magBtn);
  // 准星 / 照门
  g.add(box(0.008, 0.010, 0.008, black, 0, SLD_Y + 0.031, -0.126));
  g.add(box(0.024, 0.008, 0.010, black, 0, SLD_Y + 0.030, 0.146));
  g.add(box(0.005, 0.006, 0.004, steel, 0, SLD_Y + 0.033, -0.126));   // 准星白点

  // ============ 双手 ============
  // 用暖棕皮手套：和深灰的枪身拉开明度差，手才"看得见"，也不会和套筒混成一块。
  const glove = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.92, metalness: 0.03 });
  const gloveL = new THREE.MeshStandardMaterial({ color: 0x7a5636, roughness: 0.92, metalness: 0.03 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x3e4633, roughness: 0.97, metalness: 0.0 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98a68, roughness: 0.86 });

  // 右手：手掌紧贴握把右侧（薄薄一层，不鼓成方块），四指绕到前缘
  g.add(box(0.011, 0.098, 0.074, glove, 0.0300, -0.098, 0.116, GA));      // 掌心
  for (let i = 0; i < 4; i++) {
    const yy = -0.062 - i * 0.0235;
    const zz = 0.084 + i * 0.009;
    g.add(box(0.023, 0.0125, 0.020, glove, 0.018, yy, zz + 0.002, GA));                       // 指根
    g.add(box(0.018, 0.0105, 0.017, glove, 0.002, yy - 0.001, zz - 0.016, GA, 0, 0.2));       // 中节
    g.add(box(0.016, 0.0095, 0.014, glove, -0.014, yy - 0.003, zz - 0.029, GA, 0, 0.36));     // 指尖
  }
  // 拇指压在左侧保险上方（从右手过来，横过握把前方）
  g.add(box(0.016, 0.013, 0.044, glove, -0.024, -0.042, 0.100, -0.3, 0, 0.16));
  // 左手：托在右手下方，掌根贴着握把底，手指从前面压上右手指背
  g.add(box(0.048, 0.014, 0.070, gloveL, -0.006, -0.156, 0.126, GA));                        // 左手掌（托）
  for (let i = 0; i < 3; i++) {
    const yy = -0.104 - i * 0.024;
    g.add(box(0.020, 0.011, 0.018, gloveL, -0.022, yy, 0.086 + i * 0.008, GA));
    g.add(box(0.017, 0.0095, 0.015, gloveL, -0.007, yy - 0.002, 0.072 + i * 0.008, GA, 0, -0.24));
  }
  g.add(box(0.016, 0.012, 0.040, gloveL, -0.022, -0.052, 0.104, -0.3, 0, 0.14));             // 左拇指
  // 手腕 + 小臂 + 袖口
  g.add(box(0.052, 0.050, 0.034, skin, 0.000, -0.176, 0.170, -0.42));
  // 小臂比旧版收细一档（0.076→0.064）：竖屏画幅窄，袖子沿 Z 伸向镜头，
  // 透视放大后很容易糊掉半屏，收细后只在枪身后方露出一段，不抢戏。
  g.add(box(0.064, 0.068, 0.230, sleeve, -0.004, -0.232, 0.290, 0.42, 0, -0.08));
  g.add(box(0.072, 0.076, 0.020, sleeve, 0.004, -0.186, 0.198, 0.42, 0, -0.08));

  g.traverse((o) => { o.castShadow = true; });
  // 枪管轴线锚点：准星与枪口对齐用（x=0 为枪管中轴）
  g.userData.axis = { x: 0, y: SLD_Y + 0.002, z: -0.148, rear: 0.172 };
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

// ---- 轻量几何合并（替代 BufferGeometryUtils，避免额外依赖）----
// 把多个已应用变换的 Mesh 按材质合并成一个，显著降低 draw call。
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
      // 非索引几何先展开成索引形式，保证合并后一致
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

/** 把 group 下所有静态 Mesh 按材质合并（跳过 keep 集合里的动态节点） */
function bakeStatics(group, keep) {
  const keepSet = new Set(keep || []);
  const byMat = new Map();
  const remove = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    // 动态节点（枪、肢体）保持独立
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

// 简易部件：位置 + 旋转 + 缩放一次写完
function part(geo, material, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  return m;
}

// 迷彩布料材质（程序化迷彩纹理，按底色缓存）
const _camoCache = new Map();
function camoMat(hex, rough = 0.88) {
  // 键做归一化：multiplyScalar 会产生浮点色值，不取整会导致同一套迷彩被缓存成多个实例
  const key = `${(hex >>> 0)}_${rough.toFixed(2)}`;
  if (_camoCache.has(key)) return _camoCache.get(key);
  const c = new THREE.Color(hex);
  const size = 128, cv = cvs(size), ctx = cv.getContext('2d');
  ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect(0, 0, size, size);
  const dark = c.clone().multiplyScalar(0.55).getHexString();
  const mid = c.clone().multiplyScalar(0.78).getHexString();
  const light = c.clone().offsetHSL(0.015, 0.04, 0.1).getHexString();
  // 三层不规则迷彩斑块
  [[dark, 26, 9, 22], [mid, 22, 7, 16], [light, 16, 5, 11]].forEach(([col, n, rMin, rMax]) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `#${col}`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, rnd(rMin, rMax), rnd(rMin * 0.5, rMax * 0.7), rnd(0, 3), 0, 7);
      ctx.fill();
    }
  });
  // 布纹噪点
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

// 圆角盒（用缩放球近似，做出柔和的躯干轮廓）
function rBox(w, h, d, r = 0.55) {
  const k = `r${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!_geoCache.has(k)) {
    const g = new THREE.BoxGeometry(w, h, d, 2, 3, 2);
    const pos = g.attributes.position;
    const hw = w / 2 - r * 0.06, hh = h / 2 - r * 0.06, hd = d / 2 - r * 0.06;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // 把顶点往内收，形成圆角
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
 * 构建敌兵手中武器：AK-47（带程序化木纹 + 钢件磨砂贴图 + 完整小件）。
 * 朝向：-Z 为枪口方向，+Y 向上，原点在机匣中心附近（便于挂到手上）。
 * 返回 { group, muzzleLocal }，muzzleLocal 为枪口在 group 局部坐标中的位置，
 * 用于发射时的枪焰定位。
 */
const _gunTexCache = new Map();

function gunWoodTexture() {
  if (_gunTexCache.has('wood')) return _gunTexCache.get('wood');
  const size = 128, cv = cvs(size), ctx = cv.getContext('2d');
  ctx.fillStyle = '#8a4a1e'; ctx.fillRect(0, 0, size, size);
  // 木纹：多条带轻微起伏的深色细线
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
  // 浅色高光木丝
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
  // 磨砂颗粒
  for (let i = 0; i < 2600; i++) {
    const v = (70 + Math.random() * 70) | 0;
    ctx.fillStyle = `rgba(${v},${v + 3},${v + 7},${rnd(0.08, 0.34).toFixed(2)})`;
    ctx.fillRect(rnd(0, size), rnd(0, size), rnd(0.6, 2), rnd(0.6, 2));
  }
  // 划痕
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

// 枪的材质全局共享：所有敌人共用同一套，避免每个敌人重复创建（也减少绘制状态切换）
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

  // ============ 机匣（冲压钢 + 圆形防尘盖）============
  g.add(part(rBox(0.056, 0.072, 0.30, 0.35), receiver, 0, 0, 0.02));
  // 圆形防尘盖（半沉入机匣形成圆顶，AK 的标志性轮廓）
  const dust = part(gCyl(0.036, 0.036, 0.26, 16), receiver, 0, 0.034, 0.01, Math.PI / 2, 0, 0);
  g.add(dust);
  // 防尘盖后部的卡笋
  g.add(part(gCyl(0.012, 0.012, 0.016, 8), dark, 0, 0.05, 0.145, Math.PI / 2, 0, 0));
  // 机匣前后端面
  g.add(part(rBox(0.066, 0.086, 0.024, 0.3), dark, 0, 0, -0.115));
  g.add(part(rBox(0.066, 0.082, 0.02, 0.3), dark, 0, 0, 0.16));
  // 弹匣井（斜切）
  g.add(part(rBox(0.05, 0.05, 0.07, 0.3), dark, 0, -0.052, 0.02, 0.1, 0, 0));
  // 快慢机柄（右侧长柄）
  g.add(part(rBox(0.01, 0.014, 0.1, 0.3), dark, 0.032, -0.004, 0.075));
  g.add(part(gCyl(0.009, 0.009, 0.012, 6), steel, 0.038, -0.004, 0.02, 0, 0, Math.PI / 2));
  // 拉机柄（右侧圆柱）
  g.add(part(gCyl(0.009, 0.009, 0.04, 8), steel, 0.04, 0.026, 0.075, Math.PI / 2, 0, 0));
  // 机匣铆钉
  for (const z of [-0.06, 0.0, 0.06]) {
    g.add(part(gCyl(0.004, 0.004, 0.06, 6), steel, 0, -0.02, z, Math.PI / 2, 0, 0));
  }

  // ============ 木质护木 + 导气管 ============
  // 下护木（带上下收窄的弧度）
  g.add(part(rBox(0.058, 0.046, 0.2, 0.5), wood, 0, -0.008, -0.21));
  // 护木上的两道手指槽（深色细条）
  g.add(part(gBox(0.062, 0.004, 0.012), dark, 0, -0.006, -0.16));
  g.add(part(gBox(0.062, 0.004, 0.012), dark, 0, -0.006, -0.25));
  // 上护木（木包导气管）
  g.add(part(rBox(0.046, 0.026, 0.185, 0.5), wood, 0, 0.033, -0.205));
  // 导气管
  g.add(part(gCyl(0.012, 0.012, 0.19, 10), steel, 0, 0.05, -0.2, Math.PI / 2, 0, 0));
  // 导气箍（护木前端，连接枪管与导气管）
  g.add(part(rBox(0.034, 0.062, 0.032, 0.3), dark, 0, 0.018, -0.31));
  g.add(part(gCyl(0.008, 0.008, 0.04, 6), steel, 0.02, 0.03, -0.31, 0, 0, Math.PI / 2));

  // ============ 枪管 / 准星 / 制退器 ============
  g.add(part(gCyl(0.0125, 0.0125, 0.26, 12), steel, 0, 0.012, -0.44, Math.PI / 2, 0, 0));
  // 表尺座 + 弧形表尺
  g.add(part(rBox(0.03, 0.026, 0.05, 0.3), dark, 0, 0.052, -0.085));
  g.add(part(gBox(0.024, 0.006, 0.07), steel, 0, 0.068, -0.062, -0.1));
  g.add(part(gBox(0.03, 0.014, 0.008), dark, 0, 0.078, -0.098));
  // 准星座
  g.add(part(rBox(0.028, 0.046, 0.03, 0.3), dark, 0, 0.022, -0.545));
  // 准星护耳（两片）
  g.add(part(gBox(0.008, 0.032, 0.012), dark, -0.017, 0.062, -0.545));
  g.add(part(gBox(0.008, 0.032, 0.012), dark, 0.017, 0.062, -0.545));
  g.add(part(gBox(0.026, 0.006, 0.012), dark, 0, 0.078, -0.545));
  // 准星柱
  g.add(part(gCyl(0.003, 0.003, 0.022, 6), steel, 0, 0.055, -0.545));
  // 下挂刺刀座 / 通条
  g.add(part(gCyl(0.004, 0.004, 0.2, 6), steel, 0, -0.028, -0.44, Math.PI / 2, 0, 0));
  // 枪口制退器（斜切口）
  g.add(part(gCyl(0.017, 0.017, 0.056, 12), dark, 0, 0.012, -0.595, Math.PI / 2, 0, 0));
  g.add(part(gBox(0.032, 0.014, 0.03), dark, 0, 0.024, -0.618, 0.46));
  // 枪口内膛（黑洞）
  g.add(part(gCyl(0.0085, 0.0085, 0.024, 10), bore, 0, 0.012, -0.618, Math.PI / 2, 0, 0));

  // ============ 弯曲香蕉弹匣（三段渐进前弯 + 拉深筋）============
  g.add(part(rBox(0.044, 0.1, 0.062, 0.25), bakelite, 0, -0.098, 0.008, 0.16, 0, 0));
  g.add(part(rBox(0.043, 0.09, 0.06, 0.25), bakelite, 0, -0.185, -0.022, 0.4, 0, 0));
  g.add(part(rBox(0.041, 0.082, 0.057, 0.25), bakelite, 0, -0.268, -0.072, 0.64, 0, 0));
  // 弹匣底板
  g.add(part(rBox(0.046, 0.012, 0.062, 0.2), dark, 0, -0.308, -0.108, 0.7, 0, 0));
  // 侧边加强筋
  g.add(part(gBox(0.05, 0.006, 0.01), dark, 0, -0.13, 0.038, 0.28, 0, 0));
  g.add(part(gBox(0.049, 0.006, 0.01), dark, 0, -0.205, -0.006, 0.5, 0, 0));
  // 弹匣卡笋
  g.add(part(gBox(0.012, 0.016, 0.014), steel, 0.026, -0.062, 0.03));

  // ============ 握把 + 扳机组 ============
  g.add(part(rBox(0.038, 0.115, 0.05, 0.45), bakelite, 0, -0.088, 0.115, -0.42, 0, 0));
  // 握把防滑纹（三道横条）
  for (const dy of [-0.03, -0.06, -0.09]) {
    g.add(part(gBox(0.04, 0.005, 0.008), dark, 0, dy, 0.132 - dy * 0.35, -0.42, 0, 0));
  }
  // 扳机护圈（下缘 + 前后立柱）
  g.add(part(gBox(0.01, 0.008, 0.062), dark, 0, -0.058, 0.058));
  g.add(part(gBox(0.01, 0.038, 0.008), dark, 0, -0.04, 0.028));
  g.add(part(gBox(0.01, 0.03, 0.008), dark, 0, -0.042, 0.09));
  // 扳机
  g.add(part(gBox(0.008, 0.03, 0.008), steel, 0, -0.044, 0.058, 0.2, 0, 0));

  // ============ 枪托（木质，托颈→托身→托底板）============
  g.add(part(rBox(0.038, 0.046, 0.09, 0.4), wood, 0, -0.01, 0.2));
  g.add(part(rBox(0.042, 0.066, 0.14, 0.35), wood, 0, -0.018, 0.29));
  // 贴腮斜面
  g.add(part(gBox(0.043, 0.024, 0.09), wood, 0, 0.016, 0.225, 0.09, 0, 0));
  // 托底板（金属）
  g.add(part(rBox(0.046, 0.084, 0.014, 0.2), dark, 0, -0.024, 0.368, -0.04, 0, 0));
  // 背带环
  g.add(part(gBox(0.006, 0.016, 0.012), steel, 0.026, -0.05, 0.33));
  g.add(part(gBox(0.006, 0.016, 0.012), steel, -0.026, -0.05, -0.28));

  // ============ 战术配件（差异化：老兵加红点瞄具，精英加消音器+激光） ============
  if (variant === 'elite') {
    // 消音器（粗管 + 端盖），长度适中，不要变成"长矛"
    g.add(part(gCyl(0.023, 0.023, 0.115, 14), dark, 0, 0.012, -0.638, Math.PI / 2, 0, 0));
    g.add(part(gCyl(0.025, 0.025, 0.01, 14), steel, 0, 0.012, -0.698, Math.PI / 2, 0, 0));
    g.add(part(gCyl(0.011, 0.011, 0.007, 10), bore, 0, 0.012, -0.704, Math.PI / 2, 0, 0));
    // 消音器上的散热环
    g.add(part(gCyl(0.0245, 0.0245, 0.006, 14), steel, 0, 0.012, -0.61, Math.PI / 2, 0, 0));
    // 激光指示器（导轨下方）
    g.add(part(rBox(0.026, 0.026, 0.06, 0.3), dark, 0, -0.038, -0.2));
    g.add(part(gCyl(0.006, 0.006, 0.008, 8), GM.red, 0, -0.038, -0.232, Math.PI / 2, 0, 0));
  } else if (variant === 'vet') {
    // 侧挂红点镜
    g.add(part(rBox(0.026, 0.014, 0.05, 0.3), dark, 0, 0.062, -0.02));
    g.add(part(gCyl(0.016, 0.016, 0.05, 12), dark, 0, 0.082, -0.02, Math.PI / 2, 0, 0));
    g.add(part(gCyl(0.0135, 0.0135, 0.006, 12), GM.dot, 0, 0.082, -0.046, Math.PI / 2, 0, 0));
  }

  // 枪口局部坐标（供枪焰使用）
  const muzzleZ = variant === 'elite' ? -0.712 : -0.625;
  g.userData.muzzle = new THREE.Vector3(0, 0.012, muzzleZ);
  // 枪是整体一起动的，内部件全部合并（约 60 个 mesh → 6~8 个）
  bakeStatics(g, []);
  return g;
}

/**
 * 构建敌方士兵模型。
 * @param {number} color  军装主色（不同精英等级换色）
 * @param {number} skin   肤色
 * @param {object} opt    { elite:boolean, cap:boolean, visorColor }
 */
export function buildSoldier(color = 0xb03a3a, skin = 0xd0a07a, opt = {}) {
  const elite = !!opt.elite;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // ---- 材质 ----
  const cloth = camoMat(color, 0.9);                       // 迷彩外衣
  const clothDark = camoMat(new THREE.Color(color).multiplyScalar(0.6).getHex(), 0.92); // 迷彩裤
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

  // ---- 骨盆 / 腰带 ----
  body.add(part(rBox(0.31, 0.19, 0.21, 0.7), clothDark, 0, 0.9, 0));
  body.add(part(gBox(0.335, 0.048, 0.225), leather, 0, 0.985, 0));
  body.add(part(gBox(0.052, 0.042, 0.026), accentMat, 0, 0.985, -0.116));
  body.add(part(rBox(0.08, 0.09, 0.065, 0.5), webbing, -0.17, 0.905, -0.04, 0, 0.2, 0));
  body.add(part(rBox(0.08, 0.09, 0.065, 0.5), webbing, 0.17, 0.905, -0.04, 0, -0.2, 0));

  // ---- 躯干（圆润的人体轮廓：窄腰 → 宽胸 → 斜肩） ----
  body.add(part(rBox(0.29, 0.2, 0.19, 0.7), cloth, 0, 1.1, 0));
  const torso = part(rBox(0.34, 0.16, 0.21, 0.7), cloth, 0, 1.24, 0);
  body.add(torso);
  const chest = part(rBox(0.375, 0.2, 0.225, 0.8), cloth, 0, 1.4, 0);
  body.add(chest);
  body.add(part(gBox(0.018, 0.4, 0.01), clothDark, 0, 1.28, -0.108));
  body.add(part(gBox(0.05, 0.36, 0.02), webbing, -0.08, 1.31, -0.11, 0, 0, 0.38));

  // ---- 战术背心（贴身，窄于肩宽） ----
  const vest = part(rBox(0.295, 0.3, 0.235, 0.55), vestM, 0, 1.315, 0);
  body.add(vest);
  body.add(part(rBox(0.3, 0.05, 0.225, 0.5), vestM, 0, 1.468, -0.004));   // 肩带
  // 弹匣袋（前面两只，带翻盖与扣具）
  for (const dx of [-0.075, 0.075]) {
    body.add(part(rBox(0.076, 0.098, 0.042, 0.42), pad, dx, 1.212, -0.14));
    body.add(part(gBox(0.078, 0.018, 0.046), webbing, dx, 1.258, -0.142));
    body.add(part(gBox(0.014, 0.012, 0.008), accentMat, dx, 1.246, -0.164));
    // 袋口缝线
    body.add(part(gBox(0.07, 0.003, 0.004), webbing, dx, 1.176, -0.161));
  }
  // MOLLE 横向织带（三道）
  for (const y of [1.35, 1.395, 1.44]) {
    body.add(part(gBox(0.26, 0.009, 0.006), webbing, 0, y, -0.117));
  }
  // 侧腰收紧带 + 侧板
  body.add(part(gBox(0.008, 0.03, 0.2), webbing, -0.148, 1.29, -0.005));
  body.add(part(gBox(0.008, 0.03, 0.2), webbing, 0.148, 1.29, -0.005));
  // 胸前魔术贴条（识别条，带浅色）
  body.add(part(gBox(0.09, 0.026, 0.004), accentMat, 0, 1.452, -0.118));
  // 肩部护垫
  for (const sx of [-1, 1]) {
    body.add(part(rBox(0.09, 0.055, 0.13, 0.5), clothDark, sx * 0.145, 1.468, -0.01, 0, 0, sx * 0.35));
  }
  // 左侧水壶 / 右侧电台（不对称细节，避免"镜像复制"感）
  body.add(part(rBox(0.06, 0.1, 0.055, 0.5), webbing, -0.172, 1.19, 0.045));
  body.add(part(rBox(0.055, 0.085, 0.05, 0.5), leather, 0.172, 1.2, 0.05));
  body.add(part(gCyl(0.004, 0.004, 0.12, 6), dark2m, 0.175, 1.28, 0.05, 0.2, 0, 0));

  // ---- 头：战术头盔 + 面罩，只露出眼部一条窄缝 ----
  // 之前的做法是"黑色的头 + 一块肉色球当脸 + 两个白色圆点当瞳孔"，
  // 近看像贴了张肉色的贴纸、眼珠还是凸出来的白球。
  // 重做成：头盔壳体包住上半个头，下脸用面罩蒙住，中间一条深色护目镜，
  // 眼睛放在镜片后面做暗红/冷蓝的微反光，远看是"戴装备的人"而不是"一张脸"。
  const _h = (y) => 1.646 + y;   // 头部局部高度（头心略降，给头盔留出容纳空间，避免顶穿）

  // 颈（迷彩立领 + 护颈）
  body.add(part(gCyl(0.049, 0.062, 0.075, 14), cloth, 0, 1.552, 0.004));
  body.add(part(gCyl(0.056, 0.056, 0.014, 14), webbing, 0, 1.516, 0.004));

  // 颅骨：略收窄的椭球，作为面罩/头盔的"内衬"（深色，只做体积与遮挡）
  const skullMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.9, metalness: 0.02 });
  const head = part(gSph(0.101, 20, 16), skullMat, 0, _h(0.004), 0.006, 0, 0, 0, 0.90, 1.06, 0.98);
  body.add(head);

  // 面罩（下脸）：从鼻梁以下包住，带竖向压褶，材质偏布
  const maskCloth = new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.94, metalness: 0.02 });
  body.add(part(gSph(0.088, 18, 14), maskCloth, 0, _h(-0.030), -0.016, 0, 0, 0, 1.0, 0.86, 0.92));
  // 面罩压褶：三道从鼻翼到下颌的浅槽
  for (const [dx, rz] of [[-0.042, 0.42], [0, 0], [0.042, -0.42]]) {
    body.add(part(gBox(0.009, 0.062, 0.008), new THREE.MeshStandardMaterial({ color: 0x191a1d, roughness: 0.96 }),
      dx, _h(-0.044), -0.086, 0.18, 0, rz));
  }
  // 面罩鼻梁处的硬质一片（护鼻）
  body.add(part(rBox(0.042, 0.05, 0.026, 0.4), pad, 0, _h(-0.004), -0.088, 0.16));

  // 护目镜：一整片外凸的镜片（前移，压在面罩上而不是藏进去），两侧带镜框
  const lensMat = new THREE.MeshStandardMaterial({
    color: elite ? 0x93280f : 0x566b7c, roughness: 0.1, metalness: 0.5,
  });
  const lensDark = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.42, metalness: 0.3 });
  const glint = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.04, metalness: 0.1 });

  // 镜框（外圈，深色）+ 镜片（内圈，亮）
  // 高度落在 _h(0.006)：头盔主体在 _h(0.020)、盔沿在 _h(0.022)、面罩在 _h(-0.030)，
  // 护目镜必须卡在"眉骨—颧骨"之间，太高会被盔沿压掉一半，太低会滑到口罩上。
  body.add(part(rBox(0.136, 0.042, 0.020, 0.45), lensDark, 0, _h(0.006), -0.084));
  body.add(part(rBox(0.120, 0.028, 0.014, 0.45), lensMat, 0, _h(0.006), -0.095));
  // 两侧镜腿
  for (const sx of [-1, 1])
    body.add(part(rBox(0.024, 0.023, 0.042, 0.5), lensDark, sx * 0.076, _h(0.006), -0.060, 0, sx * 0.35, 0));
  // 镜片高光：两条斜条，让"玻璃"有反光
  for (const sx of [-1, 1])
    body.add(part(gBox(0.032, 0.004, 0.003), glint, sx * 0.028, _h(0.014), -0.103, 0, 0, -0.26));
  // 镜片后方的眼部反光点（不做白眼球）
  const eyeGlow = new THREE.MeshStandardMaterial({
    color: elite ? 0xff3a20 : 0xa89070, emissive: elite ? 0xa01000 : 0x0e0a06,
    emissiveIntensity: elite ? 1.2 : 0.5, roughness: 0.5,
  });
  for (const sx of [-1, 1])
    body.add(part(gBox(0.014, 0.007, 0.002), eyeGlow, sx * 0.027, _h(0.005), -0.101));

  // 头盔：球壳（上 60% 覆盖），前沿压在眉挡上
  const helmetMat = elite
    ? new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.72, metalness: 0.28 })
    : camoMat(new THREE.Color(color).multiplyScalar(1.05).getHex(), 0.92);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.108, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), helmetMat);
  shell.position.set(0, _h(0.020), 0.004);
  shell.scale.set(1.02, 1.06, 1.05);
  helmetMat.side = THREE.FrontSide;
  body.add(shell);
  // 盔沿（一圈加厚的边）
  body.add(part(gCyl(0.110, 0.113, 0.013, 22), elite ? pad : clothDark, 0, _h(0.022), 0.004, 0, 0, 0, 1.03, 1, 1.06));
  // 头盔前檐（压低一点，遮住镜片上沿）
  body.add(part(rBox(0.176, 0.012, 0.046, 0.4), helmetMat, 0, _h(0.056), -0.082, -0.24));
  // 头盔两侧的导轨 + 侧挂件（不对称，像真装备）
  for (const sx of [-1, 1]) {
    body.add(part(gBox(0.008, 0.026, 0.070), pad, sx * 0.106, _h(0.030), -0.012, 0, 0, 0));
    body.add(part(gCyl(0.007, 0.007, 0.014, 8), metal, sx * 0.112, _h(0.046), 0.010, 0, 0, Math.PI / 2));
  }
  // 左耳低轮廓耳机 + 麦克风臂（右侧留空，避免镜像感）
  body.add(part(gCyl(0.028, 0.028, 0.016, 14), pad, -0.104, _h(-0.006), 0.012, 0, 0, Math.PI / 2));
  body.add(part(gCyl(0.012, 0.010, 0.010, 10), dark2m, -0.114, _h(-0.006), 0.012, 0, 0, Math.PI / 2));
  const micArm = part(rBox(0.007, 0.007, 0.062, 0.4), dark2m, -0.092, _h(-0.020), -0.038, 0.30, 0.32, 0);
  body.add(micArm);
  body.add(part(gSph(0.011, 8, 6), dark2m, -0.070, _h(-0.030), -0.070));
  // 后颈护布（从头盔后沿垂下）
  body.add(part(rBox(0.148, 0.072, 0.016, 0.5), elite ? clothDark : cloth, 0, _h(-0.026), 0.092, 0.30));
  // 头盔后部的识别带
  body.add(part(gBox(0.062, 0.010, 0.004), accentMat, 0, _h(0.052), 0.098, 0.42));

  if (opt.cap) {
    // 巡逻帽（三档通用，精英改戴头盔不叠加帽檐）
    body.add(part(gCyl(0.108, 0.110, 0.020, 22), clothDark, 0, _h(0.052), 0.004, 0, 0, 0, 1.02, 1, 1.04));
    body.add(part(rBox(0.150, 0.010, 0.058, 0.4), clothDark, 0, _h(0.044), -0.082, -0.12));
    body.add(part(gBox(0.020, 0.016, 0.005), accentMat, 0, _h(0.058), -0.098));
  }
  void _h; void skullMat;
  // ---- 腿（圆柱 + 球形膝盖，自然收放） ----
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

  // ---- 手中的 AK-47（按敌人等级区分配件）----
  const gun = buildEnemyRifle(elite ? 'elite' : (opt.vet ? 'vet' : 'ak'));
  // 枪身斜置在胸前（枪托贴右肩、枪口指向左前方），是真实持枪警戒姿势；
  // 瞄准时 game.js 会再绕 X 轴抬 0.45rad，指向接近水平
  const GUN_POS = new THREE.Vector3(0.05, 1.245, -0.28);
  const GUN_ROT = new THREE.Euler(0.06, 0.44, 0.05);
  gun.position.copy(GUN_POS);
  gun.rotation.copy(GUN_ROT);
  gun.scale.setScalar(0.94);
  body.add(gun);

  // ---- 手臂：用两骨骼 IK 让手套真正握住护木与握把 ----
  // 枪局部坐标 → body 坐标 的换算
  const gq = new THREE.Quaternion().setFromEuler(GUN_ROT);
  const gs = 0.94;
  const toBody = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).multiplyScalar(gs).applyQuaternion(gq).add(GUN_POS);

  const SHOULDER = (sx) => new THREE.Vector3(sx * 0.168, 1.462, 0.01);
  const UPPER = 0.285, FORE = 0.285;

  // 两骨骼 IK：给定肩点与目标点，求肘部位置
  const solveElbow = (sh, tg, sx) => {
    const d = tg.clone().sub(sh);
    let dist = d.length();
    const maxD = UPPER + FORE - 1e-3;
    if (dist > maxD) { d.multiplyScalar(maxD / dist); dist = maxD; }
    const a = (UPPER * UPPER - FORE * FORE + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, UPPER * UPPER - a * a));
    const dir = d.clone().normalize();
    // 肘部弯向外下方
    const out = new THREE.Vector3(sx * 0.85, -0.5, 0.16).normalize();
    const perp = out.clone().sub(dir.clone().multiplyScalar(out.dot(dir)));
    if (perp.lengthSq() < 1e-6) perp.set(sx, -1, 0);
    perp.normalize();
    return sh.clone().add(dir.multiplyScalar(a)).add(perp.multiplyScalar(h));
  };

  // 用一根"摆好朝向"的圆柱连接两点
  const bone = (from, to, r0, r1, mat) => {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const m = new THREE.Mesh(gCyl(r0, r1, len, 10), mat);
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  };

  // ---- 手臂：上臂 + 前臂都每帧跟随枪做两骨骼 IK ----
  // 之前整条手臂是按枪的初始位置一次性解算再合并的静态网格，枪一转动手就留在原地，
  // 视觉上就是"枪在两只不动的手里翻来翻去"。现在肩点是固定锚点，肘/腕每帧重解。
  const upArmRoot = (sx) => {
    const g = new THREE.Group();
    const sh = SHOULDER(sx);
    g.add(part(gSph(0.062, 12, 10), cloth, sh.x, sh.y - 0.004, sh.z));
    bakeStatics(g, []);
    body.add(g);
    return g;
  };
  // 上臂做成"沿 +Y"的单位长度骨，靠 scale.y 拉伸到 肩→肘 的实际长度
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

  // 前臂（含手套）做成"沿 +Y 的局部坐标系"：原点在肘，+Y 指向腕。
  // 每次按枪的实时姿态重新解算并摆放，手就始终跟着枪走。
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

  // 每帧调用：按枪当前在 body 局部系里的矩阵，重解两骨骼 IK（肩固定 → 肘 → 腕）。
  // 这样枪抬、枪转、枪摆，两条手臂都跟着走，手始终"长在"枪上。
  const updateArms = () => {
    const gm = gx0.matrix;
    const spec = [
      [-1, upL, foreL, -0.004, -0.014, -0.205],   // 左手托护木
      [1, upR, foreR, 0.004, -0.088, 0.115],      // 右手握握把
    ];
    for (const [sx, ub, fb, lx, ly, lz] of spec) {
      const sh = SHOULDER(sx);
      _wp.set(lx, ly, lz).applyMatrix4(gm);        // 枪局部 → body 局部
      const el = solveElbow(sh, _wp, sx);

      // 上臂：肩 → 肘
      _ax.copy(el).sub(sh);
      const upLen = _ax.length() || 1e-3;
      _ax.divideScalar(upLen);
      ub.position.copy(sh);
      ub.quaternion.setFromUnitVectors(_up, _ax);
      ub.scale.set(1, upLen, 1);

      // 前臂：肘 → 腕
      _ax.copy(_wp).sub(el);
      const foLen = _ax.length() || 1e-3;
      _ax.divideScalar(foLen);
      _q.setFromUnitVectors(_up, _ax);
      // 滚转：让手套握面贴住枪身横轴（否则手腕会扭着）
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


  // 静态部分（躯干/背心/头/腰带）按材质合并，腿与前臂/枪保持独立
  bakeStatics(body, [legL, legR, armL[0], upL, armR[0], upR, foreL, foreR, gun]);

  // 整体尺寸：略微放大 + 加宽肩背，视觉上更"有分量"
  body.scale.set(1.06, 1.05, 1.06);

  // 阴影
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  root.userData = {
    head, torso: chest, vest, legL, legR, armL, armR, body, gun,
    // 每帧按枪的姿态重解算前臂 IK（枪一动，手跟着动）
    updateArms,
    // 用于受击闪红的材质集合
    flashMats: [cloth, clothDark, vestM],
  };
  return root;
}
