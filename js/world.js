// Level maps: battlefield layout plus collision boxes (multiple maps supported)
import * as THREE from '../vendor/three.module.min.js?v=20261104160817';
import { concreteTexture, containerTexture, woodTexture, crateTexture, targetTexture, skyTexture } from './assets.js?v=20261104160817';

export const ARENA = { minX: -25, maxX: 25, minZ: -25, maxZ: 25, wallH: 7 };

/**
 * Map definition. Each map returns:
 *   { spawn:Vector3, yaw:number, spawns:[Vector3], fog:{color,near,far},
 *     theme:{ground, wall, skyTint}, layout(cfg) }
 * cfg supplies the container / crate / cover / platform / lamp constructors, instantiated by World.
 */
export const MAPS = [
  {
    id: 'depot',
    name: 'STEEL DEPOT',
    desc: 'Balanced warehouse yard · classic layout',
    spawn: new THREE.Vector3(0, 0, 17),
    yaw: 0,
    fog: { color: 0xb9c8d4, near: 55, far: 150 },
    theme: { ground: 0xb8b4aa, wall: 0xc4c0b6 },
    spawns: [
      [-11, -20], [16, -20], [0, -22], [-8, -20], [9, -21],
      [22, 0], [21, 8], [-22, 0], [-21, 9],
      [-9, -16], [17, -15], [4, -14], [-17, -2], [16, 2],
    ],
    layout(c) {
      // Containers (symmetric layout, irregular cover)
      c.container(-14, -11, 6, 2.8, 2.6, '#3f5464', 0);
      c.container(-14, -15, 6, 2.8, 2.6, '#4c5b4a', 0, 2.8);
      c.container(15, -12, 2.6, 2.8, 7, '#5b3f3f', Math.PI / 2);
      c.container(-12, 13, 7, 2.8, 2.6, '#46525e', Math.PI / 2);
      c.container(13, 12, 2.6, 2.8, 6.5, '#3f5464', Math.PI / 2);
      c.container(13, 12, 2.6, 2.8, 6.5, '#50544a', Math.PI / 2, 2.8);
      c.container(0, -17, 9, 2.8, 2.6, '#4a4a52', 0);
      c.container(-19, 3, 2.6, 2.8, 5, '#444f3c', Math.PI / 2);
      c.container(19.5, -3, 2.6, 2.8, 5, '#3a4a52', Math.PI / 2);

      // Crates
      [[-6, -6], [-4.6, -6.2, 1.4, 1.4], [6, 6.5], [7.4, 6.2], [6.6, 7.8, 1.1],
       [-8, 8], [-6.7, 8.4, 1.1], [1.5, 11], [1.2, 11, 1.2, 1.2], [-1, -11.5], [-2.4, -11.9],
       [10, -2], [11.5, -2.2, 1.1], [-10, -1.5], [-11.4, -1.2, 1.1], [-9.8, -1.3, 0.9, 1.4],
      ].forEach(([x, z, s, y]) => c.crate(x, z, s || 1.4, y || 0, Math.random() * 0.4 - 0.2));

      // Low cover
      c.low(0, -6.5, 4.2, 0.95, 0.7);
      c.low(0, 7.5, 4.2, 0.95, 0.7);
      c.low(-17, -5, 0.7, 1.1, 4.5);
      c.low(17.5, 6, 0.7, 1.1, 4.5);
      c.low(-6, 17.5, 4, 1.0, 0.7);
      c.low(6.5, -20, 4, 1.0, 0.7);

      // Platform
      c.plat(-20, -19, 6, 0.35, 6, 2.6);
      c.plat(20, 19, 6, 0.35, 6, 2.6);
      c.crate(-16.6, -19, 1.4, 0, 0.1);
      c.crate(-16.0, -20.2, 1.4, 1.2, 0.2);
      c.crate(16.6, 19, 1.4, 0, -0.1);
      c.crate(16.0, 20.2, 1.4, 1.2, -0.2);

      c.lamps([[-23, -23], [23, -23], [-23, 23], [23, 23], [-23, 0], [23, 0], [-8, -23.5], [8, 23.5]]);
      c.targets([[-24, -8], [24, -18], [-24, 18]]);
      c.centerMarkings();
    },
  },

  {
    id: 'harbor',
    name: 'HARBOR NIGHTFALL',
    desc: 'Dockside maze · tight corridors and long sightlines',
    spawn: new THREE.Vector3(0, 0, 20),
    yaw: -0.25,
    fog: { color: 0x8f6a58, near: 38, far: 118 },
    theme: { ground: 0xa89a86, wall: 0xbfa892 },
    spawns: [
      [-21, -21], [21, -16], [-2, -22], [10, -20], [-12, -20],
      [22, -6], [21, 12], [-22, -2], [-21, 14],
      [-10, 1], [14, -8], [3, -14], [-8, -13], [12, 1],
    ],
    layout(c) {
      // Harbour: rows of containers form lanes, with an open lifting yard in the middle
      // Long row on the west
      c.container(-18, -16, 2.6, 2.8, 11, '#365059', Math.PI / 2);
      c.container(-18, -5, 2.6, 2.8, 11, '#4a4230', Math.PI / 2);
      c.container(-18, 6, 2.6, 2.8, 10, '#3a4a42', Math.PI / 2);
      // Long row on the east
      c.container(18, -14, 2.6, 2.8, 12, '#563a34', Math.PI / 2);
      c.container(18, -1, 2.6, 2.8, 10, '#38455a', Math.PI / 2);
      c.container(18, 10, 2.6, 2.8, 11, '#4a4230', Math.PI / 2);
      // Stacked second storey
      c.container(-18, -5, 2.6, 2.8, 11, '#5a4a38', Math.PI / 2, 2.8);
      c.container(18, 10, 2.6, 2.8, 11, '#3f4a3a', Math.PI / 2, 2.8);
      // Crosswise container in the middle (breaks the straight sight line)
      c.container(-6, -7, 9, 2.8, 2.6, '#3f5464', 0);
      c.container(7, 4, 9, 2.8, 2.6, '#4c3a3a', 0);
      c.container(0, -18, 10, 2.8, 2.6, '#42484e', 0);
      // Angled bulk cargo
      c.container(-8, 12, 7, 2.8, 2.6, '#3a4a52', 0.42);
      c.container(9, -12, 6, 2.8, 2.6, '#4a4436', -0.36);

      // Crate stacks (dock cargo)
      [[-13, 0], [-11.8, 0.4, 1.2], [12.5, -7], [11.2, -7.2, 1.1], [-4, 3], [-2.8, 3.3, 1.1],
       [3.5, 9], [4.8, 9.2], [-9, 8], [-7.8, 8.2, 1.2], [8, -19], [6.7, -19.2],
       [-14, 17], [-12.7, 17.2], [0, 16], [1.2, 16.2, 1.1],
      ].forEach(([x, z, s, y]) => c.crate(x, z, s || 1.4, y || 0, Math.random() * 0.5 - 0.25));

      // Low cover (bollards / low walls)
      c.low(-6, 0, 3.6, 0.9, 0.65);
      c.low(6, -2, 3.6, 0.9, 0.65);
      c.low(0, 8, 5, 1.0, 0.7);
      c.low(-11, -20, 4, 1.0, 0.7);
      c.low(12, 18, 4, 1.0, 0.7);
      c.low(-22, 4, 0.7, 1.15, 5);
      c.low(22, 3, 0.7, 1.15, 5);

      // Platform (crane deck)
      c.plat(-21, 19, 5.5, 0.35, 5.5, 2.9);
      c.plat(21, -20, 5.5, 0.35, 5.5, 2.9);
      c.crate(-17.8, 19, 1.4, 0, 0.1);
      c.crate(-17.2, 20.2, 1.4, 1.25, 0.2);
      c.crate(17.8, -20, 1.4, 0, -0.1);
      c.crate(17.2, -18.8, 1.4, 1.25, -0.2);

      c.lamps([[-23, -23], [23, -23], [-23, 23], [23, 23], [-2, -23.5], [2, 23.5], [-23, -6], [23, 6]]);
      c.targets([[-24, -12], [24, 8], [24, -8]]);
      // Ground markings in the central lifting yard
      c.ring(0, 0, 7.2);
    },
  },

  {
    id: 'foundry',
    name: 'FOUNDRY YARD',
    desc: 'Industrial furnace · circular arena with a central tower',
    spawn: new THREE.Vector3(0, 0, 21),
    yaw: 0,
    fog: { color: 0xa89a90, near: 42, far: 132 },
    theme: { ground: 0x9e968c, wall: 0xb2a89e },
    spawns: [
      [-16, -20], [16, -20], [0, -22], [-10, -21], [10, -21],
      [22, -2], [21, 11], [-22, -1], [-21, 12],
      [-15, -6], [15, -6], [0, -16], [-7, -16], [7, -16],
    ],
    layout(c) {
      // Central tower (octagonal feel, enclosed by four container walls)
      c.tower(0, 0, 4.6, 3.6);
      // Furnaces and chimneys arranged in a ring
      c.container(-13, 4, 5, 2.8, 2.6, '#4a3a30', 0.3);
      c.container(13, 4, 5, 2.8, 2.6, '#4a3a30', -0.3);
      c.container(-13, -9, 5, 2.8, 2.6, '#3a4048', -0.2);
      c.container(13, -9, 5, 2.8, 2.6, '#3a4048', 0.2);
      // Skeleton of the factory roof around the edge (used as cover)
      c.container(-20, -4, 2.6, 2.8, 8, '#3f3a34', Math.PI / 2);
      c.container(20, 2, 2.6, 2.8, 8, '#3f3a34', Math.PI / 2);
      c.container(-7, 18, 8, 2.8, 2.6, '#463c34', 0.1);
      c.container(8, -19, 8, 2.8, 2.6, '#3a3f46', -0.1);
      // Two storeys
      c.container(-20, -4, 2.6, 2.8, 8, '#4f463a', Math.PI / 2, 2.8);

      // Ingots / crates
      [[-7, 7], [-5.9, 7.4, 1.1], [7, 7], [8.2, 7.3, 1.2], [-7, -7], [-5.8, -7.3],
       [7, -8], [8.1, -8.3, 1.1], [-16, 12], [-14.7, 12.2], [16, 12], [14.6, 12.3],
       [0, 12], [1.4, 12.2, 1.1], [0, -12], [-1.3, -12.4],
      ].forEach(([x, z, s, y]) => c.crate(x, z, s || 1.4, y || 0, Math.random() * 0.6 - 0.3));

      // Ring of low walls (in segments, forming cover around the centre)
      const segs = [[0, -8.5, 4.5, 0], [0, 8.5, 4.5, 0], [-8.5, 0, 0.7, 4.5], [8.5, 0, 0.7, 4.5]];
      for (const [x, z, w, d] of segs) {
        c.low(x, z, d > w ? 0.7 : w, 1.0, d > w ? d : 0.7);
      }
      c.low(-19, 15, 0.7, 1.1, 4);
      c.low(19, -14, 0.7, 1.1, 4);

      // Platform
      c.plat(-21, -20, 5.5, 0.35, 5.5, 2.75);
      c.plat(21, -20, 5.5, 0.35, 5.5, 2.75);
      c.crate(-17.9, -20, 1.4, 0, 0.1);
      c.crate(-17.3, -18.9, 1.4, 1.2, 0.2);
      c.crate(17.9, -20, 1.4, 0, -0.1);
      c.crate(17.3, -18.9, 1.4, 1.2, -0.2);

      c.lamps([[-23, -23], [23, -23], [-23, 23], [23, 23], [-23, 8], [23, -8], [0, -23.5], [0, 23.5]]);
      c.targets([[-24, 0], [24, 0], [-24, -16]]);
      c.ring(0, 0, 11.5);
    },
  },
];

export function getMap(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}

export class World {
  constructor(scene, quality = 'low', mapId = 'depot') {
    this.scene = scene;
    this.colliders = [];      // {minX,maxX,minY,maxY,minZ,maxZ}
    this.meshes = [];
    this._materials = [];
    this.quality = quality;
    this.map = getMap(mapId);
    this.mapId = this.map.id;
    // Spawn point and facing come from the map
    this.spawn = this.map.spawn.clone();
    this.spawnYaw = this.map.yaw || 0;
    this.spawns = this.map.spawns.map(([x, z]) => new THREE.Vector3(x, 0, z));
    // Record the nodes that existed beforehand (World manages lights and sky, but the camera and others must survive)
    this._baseChildren = new Set(scene.children);
    this.build();
  }

  addBox(mesh, solid = true, pad = 0) {
    this.scene.add(mesh);
    this.meshes.push(mesh);
    if (solid) {
      const b = new THREE.Box3().setFromObject(mesh);
      this.colliders.push({
        minX: b.min.x - pad, maxX: b.max.x + pad,
        minY: b.min.y, maxY: b.max.y,
        minZ: b.min.z - pad, maxZ: b.max.z + pad,
      });
    }
    return mesh;
  }

  addCollider(cx, cy, cz, w, h, d) {
    this.colliders.push({
      minX: cx - w / 2, maxX: cx + w / 2,
      minY: cy - h / 2, maxY: cy + h / 2,
      minZ: cz - d / 2, maxZ: cz + d / 2,
    });
  }

  build() {
    const S = this.scene;
    const hi = this.quality === 'high';
    const th = this.map.theme;

    // Sky dome (radius kept inside the camera's far plane so it is not clipped into a black hole)
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1200, 48, 28),
      new THREE.MeshBasicMaterial({
        map: skyTexture(), side: THREE.BackSide,
        depthWrite: false, fog: false,
      })
    );
    sky.renderOrder = -1;
    S.add(sky);
    this.sky = sky;
    S.fog = new THREE.Fog(this.map.fog.color, this.map.fog.near, this.map.fog.far);

    // Ground (far larger than the walls, so the edge of the ground never shows as a black void)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900),
      new THREE.MeshStandardMaterial({ map: concreteTexture(90), roughness: 0.95, metalness: 0.02, color: th.ground })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    S.add(ground);

    // Surrounding walls
    const wallMat = new THREE.MeshStandardMaterial({ map: concreteTexture(10), roughness: 0.92, metalness: 0.03, color: th.wall });
    const W = ARENA.maxX - ARENA.minX, H = ARENA.wallH;
    const mkWall = (x, z, w, d) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallMat);
      m.position.set(x, H / 2, z);
      m.receiveShadow = true; m.castShadow = hi;
      this.addBox(m, true);
    };
    mkWall(0, ARENA.minZ - 0.5, W + 2, 1);
    mkWall(0, ARENA.maxZ + 0.5, W + 2, 1);
    mkWall(ARENA.minX - 0.5, 0, 1, W + 2);
    mkWall(ARENA.maxX + 0.5, 0, 1, W + 2);

    // ---- Shared materials ----
    const crateMat = new THREE.MeshStandardMaterial({ map: crateTexture(), roughness: 0.85, metalness: 0.05 });
    const lowMat = new THREE.MeshStandardMaterial({ map: concreteTexture(3), color: 0xbab4a2, roughness: 0.95 });
    const platMat = new THREE.MeshStandardMaterial({ map: woodTexture(4), roughness: 0.9, color: 0xd8cdb8 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.55, metalness: 0.75 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: 0.5, metalness: 0.7 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x33383d, roughness: 0.6, metalness: 0.7 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd27a, emissiveIntensity: 2.2 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xd8d2b8, roughness: 0.9, transparent: true, opacity: 0.5, side: THREE.DoubleSide });

    // Track every material created for this map so switching can release them together
    this._materials.push(wallMat, crateMat, lowMat, platMat, legMat, railMat, poleMat, lampMat, lineMat, ground.material);

    // ---- Layout constructors ----
    const container = (x, z, w, h, d, color, ry = 0, y = 0) => {
      const tex = containerTexture(color, Math.max(2, Math.round(Math.max(w, d) / 3)));
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.68, metalness: 0.42 })
      );
      m.position.set(x, y + h / 2, z); m.rotation.y = ry;
      m.castShadow = hi; m.receiveShadow = true;
      this.scene.add(m); this.meshes.push(m);
      const b = new THREE.Box3().setFromObject(m);
      this.colliders.push({ minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z });
      // Door detail painted onto the container surface (no floating geometry, which showed as big black blocks at distance)
      const longAxisIsX = w >= d;
      const doorMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.72, metalness: 0.4,
        map: (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const ctx = c.getContext('2d');
          // Door panel base: a touch darker than the container, never pure black
          const base = new THREE.Color(color).multiplyScalar(0.82);
          ctx.fillStyle = '#' + base.getHexString();
          ctx.fillRect(0, 0, 128, 128);
          // Door seams and frame
          ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.lineWidth = 3;
          ctx.strokeRect(6, 6, 116, 116);
          ctx.beginPath(); ctx.moveTo(64, 6); ctx.lineTo(64, 122); ctx.stroke();
          // Corner hinges
          ctx.fillStyle = 'rgba(0,0,0,.3)';
          for (const [hx, hy] of [[10, 10], [112, 10], [10, 112], [112, 112]]) {
            ctx.fillRect(hx - 5, hy - 5, 10, 10);
          }
          // Locking bars
          ctx.fillStyle = 'rgba(190,198,208,.6)';
          ctx.fillRect(50, 8, 4, 112);
          ctx.fillRect(74, 8, 4, 112);
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        })(),
      });
      for (const sgn of [-1, 1]) {
        for (const half of [-1, 1]) {
          const dw = (longAxisIsX ? d : w) * 0.46, dh = h * 0.86;
          const door = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), doorMat);
          if (longAxisIsX) {
            door.position.set(sgn * (w / 2 + 0.006), 0, half * (d * 0.24));
            door.rotation.y = sgn * Math.PI / 2;
          } else {
            door.position.set(half * (w * 0.24), 0, sgn * (d / 2 + 0.006));
            door.rotation.y = sgn > 0 ? 0 : Math.PI;
          }
          m.add(door);
        }
      }
      return m;
    };

    const crate = (x, z, s = 1.4, y = 0, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
      m.position.set(x, y + s / 2, z); m.rotation.y = ry;
      m.castShadow = hi; m.receiveShadow = true;
      return this.addBox(m, true);
    };

    const low = (x, z, w, h, d, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lowMat);
      m.position.set(x, h / 2, z); m.rotation.y = ry;
      m.castShadow = hi; m.receiveShadow = true;
      this.addBox(m, true);
      // Sandbag layer on top
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xa89c84, roughness: 0.98 });
      const nb = Math.max(2, Math.round(Math.max(w, d) / 0.55));
      for (let i = 0; i < nb; i++) {
        const bt = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, Math.min(w, d) * 0.9, 3, 6), sandMat);
        bt.rotation.z = Math.PI / 2;
        if (d > w) bt.rotation.y = Math.PI / 2;
        const t = (i + 0.5) / nb - 0.5;
        if (w > d) { bt.position.set(t * w * 0.92, 0.06, 0); bt.rotation.z = Math.PI / 2; }
        else { bt.position.set(0, 0.06, t * d * 0.92); bt.rotation.set(Math.PI / 2, 0, 0); bt.scale.set(1, 1, 0.7); }
        m.add(bt);
      }
      return m;
    };

    const plat = (x, z, w, h, d, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), platMat);
      m.position.set(x, y - h / 2, z);
      m.castShadow = hi; m.receiveShadow = true;
      this.addBox(m, true);
      for (const [ox, oz] of [[-w / 2 + 0.35, -d / 2 + 0.35], [w / 2 - 0.35, -d / 2 + 0.35], [-w / 2 + 0.35, d / 2 - 0.35], [w / 2 - 0.35, d / 2 - 0.35]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, y - h, 0.22), legMat);
        leg.position.set(x + ox, (y - h) / 2, z + oz);
        leg.castShadow = hi; this.scene.add(leg);
        this.addCollider(x + ox, (y - h) / 2, z + oz, 0.3, y - h, 0.3);
      }
      // Railings on both sides facing the field
      const inward = x < 0 ? 1 : -1;
      const sideZ = z < 0 ? 1 : -1;
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, d), railMat);
      r1.position.set(x + inward * (w / 2 - 0.1), y + 0.47, z);
      this.scene.add(r1);
      this.addCollider(r1.position.x, y + 0.47, z, 0.16, 0.95, d);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.95, 0.09), railMat);
      r2.position.set(x, y + 0.47, z + sideZ * (d / 2 - 0.1));
      this.scene.add(r2);
      this.addCollider(x, y + 0.47, r2.position.z, w, 0.95, 0.16);
    };

    const lamps = (pts) => {
      for (const [x, z] of pts) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.5, 8), poleMat);
        p.position.set(x, 2.75, z); p.castShadow = hi; this.scene.add(p);
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.7), lampMat);
        l.position.set(x, 5.6, z); this.scene.add(l);
        this.addCollider(x, 2.75, z, 0.4, 5.5, 0.4);
      }
    };

    const targets = (pts) => {
      const tm = new THREE.MeshStandardMaterial({ map: targetTexture(), roughness: 0.9 });
      for (const [x, z] of pts) {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), tm);
        t.position.set(x, 1.2, z);
        t.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(t);
      }
    };

    const centerMarkings = () => {
      for (const off of [-8, 8]) {
        const l = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 40), lineMat);
        l.rotation.x = -Math.PI / 2; l.position.set(off, 0.012, 0);
        this.scene.add(l);
      }
      const circle = new THREE.Mesh(new THREE.RingGeometry(5.4, 5.75, 40), lineMat);
      circle.rotation.x = -Math.PI / 2; circle.position.y = 0.012; this.scene.add(circle);
    };

    const ring = (x, z, r) => {
      const c = new THREE.Mesh(new THREE.RingGeometry(r - 0.28, r, 48), lineMat);
      c.rotation.x = -Math.PI / 2; c.position.set(x, 0.013, z); this.scene.add(c);
      const c2 = new THREE.Mesh(new THREE.RingGeometry(r * 0.42 - 0.16, r * 0.42, 36), lineMat);
      c2.rotation.x = -Math.PI / 2; c2.position.set(x, 0.013, z); this.scene.add(c2);
    };

    // Central tower (three container walls plus a top platform)
    const tower = (x, z, w, h) => {
      const mat = new THREE.MeshStandardMaterial({ map: containerTexture('#454b52', 3), roughness: 0.8, metalness: 0.35 });
      const mats2 = new THREE.MeshStandardMaterial({ map: containerTexture('#5a4636', 2), roughness: 0.85, metalness: 0.3 });
      // Corner posts
      const inner = w * 0.42;
      for (const [ox, oz] of [[-inner, -inner], [inner, -inner], [-inner, inner], [inner, inner]]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.0, h, 1.0), mat);
        col.position.set(x + ox, h / 2, z + oz);
        col.castShadow = hi; this.addBox(col, true);
      }
      // Top platform (reachable by jumping from the side)
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, w), mats2);
      top.position.set(x, h + 0.15, z);
      top.castShadow = hi; top.receiveShadow = true;
      this.addBox(top, true);
      // Low railings around the edge
      for (const [ox, oz, rw, rd] of [[0, -w / 2 + 0.1, w, 0.12], [0, w / 2 - 0.1, w, 0.12], [-w / 2 + 0.1, 0, 0.12, w], [w / 2 - 0.1, 0, 0.12, w]]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.8, rd), railMat);
        r.position.set(x + ox, h + 0.7, z + oz);
        this.scene.add(r);
        this.addCollider(x + ox, h + 0.7, z + oz, rw, 0.8, rd);
      }
      // Mid-level cross beams (visual only)
      for (const [ox, oz, rw, rd] of [[0, 0, w + 0.1, 0.24], [0, 0, 0.24, w + 0.1]]) {
        const bm = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.24, rd), railMat);
        bm.position.set(x + ox, h * 0.62, z + oz);
        this.scene.add(bm);
      }
      // Ladder (visual detail)
      for (let i = 0; i < 6; i++) {
        const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), railMat);
        rung.position.set(x, 0.4 + i * 0.5, z + w / 2 + 0.06);
        this.scene.add(rung);
      }
    };

    const pickCrate = (s) => s; // placeholder, keeps the API consistent

    this.map.layout({ container, crate, low, plat, lamps, targets, centerMarkings, ring, tower, pickCrate, hi });

    // Distant background buildings (silhouettes). Placed beyond the fog's far plane so they dissolve into the fog colour,
    // using MeshBasicMaterial: unaffected by light direction, so back faces never go black,
    // and avoiding the odd shading standard materials get outside the shadow camera.
    const bgColor = new THREE.Color(this.map.fog.color).multiplyScalar(0.94);
    const bgMat = new THREE.MeshBasicMaterial({ color: bgColor, fog: true });
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + 0.2;
      const r = 78 + Math.random() * 30;
      const h = 6 + Math.random() * 15;
      const b = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 8, h, 8 + Math.random() * 8), bgMat);
      b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      b.rotation.y = Math.random() * Math.PI;
      S.add(b);
    }
    this._bgMeshes = S.children.filter((o) => o.material === bgMat);

    // A second, more distant skyline ring: denser and closer to the fog colour, creating depth
    const farColor = new THREE.Color(this.map.fog.color).lerp(new THREE.Color(0xffffff), 0.16);
    const farMat = new THREE.MeshBasicMaterial({ color: farColor, fog: true });
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + 0.05;
      const r = 150 + Math.random() * 60;
      const h = 12 + Math.random() * 30;
      const b = new THREE.Mesh(new THREE.BoxGeometry(10 + Math.random() * 14, h, 10 + Math.random() * 14), farMat);
      b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      b.rotation.y = Math.random() * Math.PI;
      S.add(b);
    }
    this._farMeshes = S.children.filter((o) => o.material === farMat);
  }

  // Ray against collision boxes
  raycast(origin, dir, maxDist) {
    let best = null;
    const boxes = this.colliders;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const t = rayBox(origin, dir, b);
      if (t !== null && t <= maxDist && (!best || t < best.dist)) {
        best = { dist: t, box: b, point: origin.clone().addScaledVector(dir, t) };
      }
    }
    return best;
  }

  // Resolve a moving body against walls and obstacles (AABB vs AABB along the least penetration axis)
  resolve(pos, radius, height) {
    const eps = 0.0005;
    for (let iter = 0; iter < 2; iter++) {
      for (const b of this.colliders) {
        const footY = pos.y, headY = pos.y + height;
        if (headY <= b.minY || footY >= b.maxY - 0.02) continue;
        const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        const dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > radius * radius) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = radius - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        } else {
          const pxs = [pos.x - b.minX, b.maxX - pos.x, pos.z - b.minZ, b.maxZ - pos.z];
          const m = Math.min(...pxs);
          if (m === pxs[0]) pos.x = b.minX - radius - eps;
          else if (m === pxs[1]) pos.x = b.maxX + radius + eps;
          else if (m === pxs[2]) pos.z = b.minZ - radius - eps;
          else pos.z = b.maxZ + radius + eps;
        }
      }
    }
    const m = radius + 0.6;
    pos.x = Math.max(ARENA.minX + m, Math.min(ARENA.maxX - m, pos.x));
    pos.z = Math.max(ARENA.minZ + m, Math.min(ARENA.maxZ - m, pos.z));
    return pos;
  }

  // Ground height (supports standing on crates and platforms)
  groundHeight(x, z, radius, currentY) {
    let h = 0;
    for (const b of this.colliders) {
      if (b.maxY > 3.6) continue; // too high to stand on
      if (x + radius * 0.6 < b.minX || x - radius * 0.6 > b.maxX) continue;
      if (z + radius * 0.6 < b.minZ || z - radius * 0.6 > b.maxZ) continue;
      if (b.maxY <= currentY + 0.35 && b.maxY > h) h = b.maxY;
    }
    return h;
  }

  dispose() {
    // Record the scene children present before this World and remove everything added on exit
    if (this._baseChildren) {
      for (const obj of [...this.scene.children]) {
        if (this._baseChildren.has(obj)) continue;
        this.scene.remove(obj);
      }
    }
    for (const m of this.meshes) {
      this.scene.remove(m);
      if (m.geometry && m.geometry !== undefined) m.geometry.dispose();
    }
    // Release materials (and their textures, to avoid leaking GPU memory)
    for (const mat of this._materials || []) {
      for (const k of ['map', 'normalMap', 'emissiveMap']) {
        if (mat[k]) mat[k].dispose();
      }
      mat.dispose();
    }
    this.meshes = [];
    this.colliders = [];
    this._materials = [];
  }
}

// Ray-AABB (slab method), returns the entry distance
export function rayBox(o, d, b) {
  let tmin = -Infinity, tmax = Infinity;
  for (const ax of ['x', 'y', 'z']) {
    const od = d[ax];
    const oo = o[ax];
    const mn = ax === 'x' ? b.minX : ax === 'y' ? b.minY : b.minZ;
    const mx = ax === 'x' ? b.maxX : ax === 'y' ? b.maxY : b.maxZ;
    if (Math.abs(od) < 1e-8) {
      if (oo < mn || oo > mx) return null;
    } else {
      let t1 = (mn - oo) / od, t2 = (mx - oo) / od;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : null;
}

// Ray-capsule (used for enemy hit detection)
export function rayCapsule(o, d, base, radius, height) {
  let tmin = -Infinity, tmax = Infinity;
  if (Math.abs(d.y) < 1e-8) {
    if (o.y < base.y || o.y > base.y + height) return null;
  } else {
    let t1 = (base.y - o.y) / d.y, t2 = (base.y + height - o.y) / d.y;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
  }
  const ox = o.x - base.x, oz = o.z - base.z;
  const a = d.x * d.x + d.z * d.z;
  const bq = 2 * (ox * d.x + oz * d.z);
  const c = ox * ox + oz * oz - radius * radius;
  if (a < 1e-8) { if (c > 0) return null; }
  else {
    const disc = bq * bq - 4 * a * c;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const t1 = (-bq - sq) / (2 * a), t2 = (-bq + sq) / (2 * a);
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
  }
  if (tmax < 0 || tmin > tmax) return null;
  return tmin >= 0 ? tmin : 0;
}
