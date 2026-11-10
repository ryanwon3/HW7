# HW7

A browser game: dodge projectiles by right-click moving your character while playing a QWER rhythm game. See [spec.md](spec.md).

## Running

No build step. The game uses ES modules, so it must be served over HTTP (opening `index.html` directly from disk will not work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## How to play

- **Right hand:** right click to move. Projectiles fly in from every direction; red arrows at the screen edge warn you about ones you can't see yet.
- **Left hand:** press `Q` `W` `E` `R` when a tile in that lane crosses the white line.
- You have 3 HP, with a short invulnerability window after each hit. Game over at 0 HP.
- You earn 10 points per second survived **while your rhythm accuracy is at least 80%**.

### Songs

- **Demo track**: a song generated in code with an exact tile map (Easy / Normal / Hard).
- **Your own audio file**: pick any mp3/wav/ogg/m4a. The tile map is generated in the browser by beat (onset) detection, see `src/beatmap.js`. The song loops until you die.
- **Links**: direct audio file links work if the host allows cross-site downloads (CORS). **YouTube and Spotify links can't work in a static web page**: those sites don't let other pages download their audio (CORS, DRM, terms of service). Supporting them would need a server-side downloader, so for now the link box explains this and asks for an audio file instead.

### Rhythm accuracy

| Judgement | Timing window | Accuracy |
| --- | --- | --- |
| Perfect | ±45 ms | 100% |
| Great | ±90 ms | 80% |
| Good | ±135 ms | 50% |
| Miss | tile not hit in time | 0% |

Accuracy = average of the judgements so far. Presses are timed with the key event's own timestamp mapped onto the audio hardware clock (`AudioContext.getOutputTimestamp`), so judgement does not depend on frame rate. Each hit shows how many ms early/late you were. If your hits are consistently late or early, use **Settings → Audio offset** in the menu.

### Projectiles

| Type | Hitbox | Appears after |
| --- | --- | --- |
| Bullet | circle | start |
| Arrow | capsule along the shaft | 8 s |
| Spread (5-way fan) | circles | 18 s |
| Boulder | big circle | 28 s |
| Homing orb | circle, steers toward you for 6 s | 40 s |
| Laser | dashed warning, then a capsule beam | 55 s |

Hitboxes are exactly the drawn shapes, and moving shots are tested along their whole path each step so fast ones can't pass through you. Press `H` in game to see the hitbox outlines. Spawn rate ramps up the longer you survive.

## Controls

| Input | Action |
| --- | --- |
| Right click | Move to that spot (hold to keep steering) |
| Q W E R | Hit rhythm tiles |
| Mouse at screen edge | Pan the camera |
| Hold Space | Center camera on the player |
| Y | Toggle camera lock on the player |
| S | Stop moving |
| H | Show hitboxes |
| Esc / P | Pause |
| Enter | Play again (game over screen) |

## Tests

```sh
node tests/rhythm-and-hitboxes.test.mjs   # judgement windows, accuracy maths, exact hit tests
node tests/beatmap.test.mjs               # beat detector vs the demo song's known note times
```

## Code layout

- `src/config.js` – all tuning values (speeds, spawn rates, timing windows, scoring)
- `src/input.js` – mouse/keyboard state, disables the right-click menu
- `src/camera.js` – edge panning and world/screen conversion
- `src/player.js` – player movement, HP, circular hitbox
- `src/projectiles.js` – projectile types and the spawner
- `src/collision.js` – circle and capsule hit tests
- `src/rhythm.js` – QWER tiles, judgement and accuracy
- `src/audio.js` – song playback (looping) and the song clock
- `src/beatmap.js` – audio → tile map (FFT spectral-flux onset detection)
- `src/demoSong.js` – generated demo song and its chart
- `src/hud.js` – score/accuracy/HP panel and off-screen warnings
- `src/ui.js` – menu, pause and game over screens
- `src/effects.js` – move-click marker
- `src/world.js` – ground rendering
- `src/game.js` – game loop (fixed timestep) and game states
