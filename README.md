# ZERO STRIKE · Browser Tactical FPS

A CS-style first-person shooter that runs entirely in the browser — no download, no plugins. Works on both desktop and mobile.

**Live:** https://www.monoai.com · **Contact:** cybrpnk@qq.com

## Features

- **3 maps** — Steel Depot (classic warehouse), Harbor Nightfall (dockside maze at dusk), Foundry Yard (circular arena with a central tower). Pick from the main menu; the switch rebuilds the arena instantly.
- **Detailed enemy soldiers** — layered tactical vests, pouches, knee/elbow pads, helmets with rails and goggles, comms headsets. Three tiers: Grunt (red), Veteran (blue), Elite (black, red visor, slightly larger). Walk/aim/death animations.
- **Full cross-platform controls**
  - Desktop: pointer-lock mouse look, WASD, RMB aim-down-sights.
  - Mobile: virtual joystick + drag-anywhere look (adaptive sensitivity so looking up/down works on any screen), FIRE / jump / reload / switch buttons.
- **Two hand-built weapons** — a first-person **AK-47** (stamped receiver + dust-cover dome, walnut handguards and stock, bakelite curved magazine, slant muzzle brake, leaf sight and front-sight ears) and a **Desert Eagle .50AE** (two-stage slide, sawtooth top rib, gas vents, oversized bore, chunky grip with finger grooves). Both include gloved hands and sleeves, muzzle flash, recoil, ADS, reload and damage falloff.
- **Wave survival** — 3 waves, 14 hostiles, resupply between waves, 2-minute limit.
- **Scoring** — 100 per kill, 150 for elites, +50 headshot bonus.
- **Zero external assets** — all textures, models and sounds are generated procedurally at runtime (three.js is the only dependency, vendored locally).

## Run

Any static server:

```bash
python3 -m http.server 8099
# open http://localhost:8099
```

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | W A S D | Left stick |
| Look | Mouse | Drag anywhere |
| Fire | Left click | FIRE button |
| ADS | Right click | — |
| Reload | R | ⟳ |
| Switch weapon | 1 / 2 / wheel | ⇄ |
| Sprint / Jump / Crouch | Shift / Space / Ctrl | ⤒ |
| Pause | Esc | ❚❚ |

## Tech notes

- three.js r160 (ES modules), dual-scene rendering for the first-person weapon.
- AABB collision + ray-slab/ray-capsule hit detection; head-shot spheres.
- Web Audio API synthesized SFX; Canvas 2D procedural textures.
- Adaptive resolution scaling keeps the frame rate stable on phones.

## Deployment

- Repository: `netnpc/netnpc.github.io`, branch `main`, custom domain `www.monoai.com`
- A plain `git push` publishes (GitHub Pages builds automatically)
- Static asset version stamps are injected by `.githooks/pre-commit`, see `tools/version_stamp.py`

### Enable the pre-commit hook (once per clone)

`core.hooksPath` lives in the local git config, so it is not carried by the
repository and a fresh clone does not run the hook. Enable it once after
cloning:

```bash
git config core.hooksPath .githooks
```

Why it matters: GitHub Pages serves `js/*.js` with `cache-control: max-age=600`,
and ES module imports are static, so they cannot be cache-busted at runtime.
Without the hook a push can leave visitors on the old build for up to ten
minutes, which looks exactly like "I pushed but nothing changed".

Verify it is active:

```bash
git config --get core.hooksPath    # prints: .githooks
```

To stamp assets by hand instead (the hook does this automatically):

```bash
python3 tools/version_stamp.py
```
