# HW7

A browser game: dodge projectiles by right-click moving your character while playing a QWER rhythm game. See [spec.md](spec.md).

## Running

No build step. The game uses ES modules, so it must be served over HTTP (opening `index.html` directly from disk will not work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

| Input | Action |
| --- | --- |
| Right click | Move to that spot (hold to keep steering) |
| Mouse at screen edge | Pan the camera |
| Hold Space | Center camera on the player |
| Y | Toggle camera lock on the player |
| S | Stop moving |

## Code layout

- `src/config.js` – tuning values (world size, speeds, edge-pan size)
- `src/input.js` – mouse/keyboard state, disables the right-click menu
- `src/camera.js` – edge panning and world/screen conversion
- `src/player.js` – player movement and circular hitbox
- `src/effects.js` – move-click marker
- `src/world.js` – ground rendering
- `src/game.js` – game loop (fixed timestep) tying it together
