# HW7: Dodge + Rhythm

A browser game where you play two games at once. Your right hand moves a character by right-clicking to dodge projectiles flying in from every direction. Your left hand plays a falling-tiles rhythm game on `Q` `W` `E` `R`. You only earn points while your rhythm accuracy is at least 80%. The design brief is in [spec.md](spec.md).

Plain HTML canvas and JavaScript ES modules. No build step, no dependencies, nothing to `npm install`.

---

## 1. Install and run

### What you need

- A desktop browser: Chrome, Edge or Firefox (recent versions). Safari works but see [Known bugs and traps](#6-known-bugs-and-traps).
- A mouse with a right button. A trackpad works if two-finger click is right click, but it's much harder.
- Any way to serve a folder over HTTP. Python 3 is the easiest. Node.js is only needed to run the tests.

### Steps

```sh
git clone --branch main https://github.com/ryanwon3/HW7.git
cd HW7
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser and click **Play the demo track**.

On Windows, the Python command is usually `py` or `python` instead of `python3`:

```bat
py -m http.server 8000
```

No Python? Any static file server works, for example `npx serve -l 8000` (needs Node.js), or the "Live Server" extension in VS Code.

> **Don't double-click `index.html`.** Browsers block ES modules loaded from `file://`, so you get a blank page with a CORS error in the console. It has to be served over `http://`.

> **Use `--branch main` when cloning.** The repository's default branch on GitHub is currently an old work branch that only contains `spec.md`. A plain `git clone` will check that out and you'll see no game.

### Run the tests (optional, needs Node.js 18+)

```sh
node tests/rhythm-and-hitboxes.test.mjs   # timing windows, accuracy maths, exact hitboxes
node tests/beatmap.test.mjs               # beat detector vs the demo song's known note times
```

Each line prints `ok` or `FAIL`, and the process exits with code 1 if anything failed. There's no test runner or `package.json`; the tests are plain scripts.

---

## 2. How to play

### Goal

Survive as long as you can while keeping your rhythm accuracy at or above 80%. You score **10 points per second** survived, but only while accuracy is at or above 80%, and only after the first tile has been judged. Your best score is saved in the browser.

You have **3 HP**. Each hit costs 1 HP and gives you 1.2 seconds of invulnerability (the character blinks). At 0 HP it's game over.

### Controls

| Input | Action |
| --- | --- |
| **Right click** | Walk to that spot. Hold the button to keep steering toward the cursor. |
| **Q W E R** | Hit a tile in lanes 1–4 as it crosses the white line |
| Mouse at the screen edge | Pan the camera |
| Hold **Space** | Keep the camera centered on your character |
| **Y** | Toggle camera lock on your character |
| **S** | Stop walking |
| **H** | Show hitbox outlines (debug view) |
| **Esc** or **P** | Pause / resume |
| **Enter** | Play again (on the game over screen) |

The game also pauses itself if the window loses focus (alt-tab, clicking the address bar, switching tabs).

### Songs

- **Demo track** (Easy / Normal / Hard): a ~38 second song generated in code with a hand-exact tile map. Best for checking timing.
- **Your own audio file**: pick any mp3, wav, ogg, m4a or flac from the menu. The game finds the beats and builds a tile map in the browser. Difficulty changes how dense the map is.
- **Direct audio link**: a URL straight to an audio file works only if that server allows cross-site downloads (CORS). Many don't.
- **YouTube and Spotify links do not work.** See [acceptance criteria](#3-acceptance-criteria-and-spec-status) for why.

The song loops until you die, with a 1.5 s gap between loops. There's a 3 second countdown before the first tile.

### Rhythm judging

| Judgement | Timing window | Counts as |
| --- | --- | --- |
| Perfect | within ±45 ms | 100% |
| Great | within ±90 ms | 80% |
| Good | within ±135 ms | 50% |
| Miss | tile passes the line by more than 135 ms | 0% |

Accuracy is the average over every tile judged so far in the run. After each hit the lane shows how many ms early or late you were. **If your hits are consistently early or late, open Settings in the menu and change "Audio offset"** (raise it if you're late, lower it if you're early). Bluetooth headphones usually need +100 to +250 ms.

Pressing a key when there's no tile nearby does nothing (it is not counted as a miss).

### Projectiles

They come from all directions, from just outside the screen. A red arrow at the screen edge points at incoming shots you can't see yet. More types unlock the longer you survive, and they spawn faster over time.

| Type | Looks like | Hitbox | Unlocks at |
| --- | --- | --- | --- |
| Bullet | small orange ball | circle | start |
| Arrow | thin white line, fast | capsule along the shaft | 8 s |
| Spread | fan of 5 yellow balls | 5 circles | 18 s |
| Boulder | big brown rock, slow | large circle | 28 s |
| Homing orb | purple pulsing ball | circle; steers toward you for 6 s, then flies straight | 40 s |
| Laser | dashed red warning line, then a solid beam | capsule the width of the beam; only hurts while solid | 55 s |

Hitboxes are exactly the shapes drawn on screen. Press `H` to see them.

---

## 3. Acceptance criteria and spec status

### Acceptance criteria (from spec.md)

| Criterion | Status | Evidence |
| --- | --- | --- |
| The player can move by right clicking on the screen | ✅ **Met** | `src/input.js` + `src/player.js`. Right-click sets a walk target, hold to steer. Browser context menu is disabled. |
| Accuracy on the rhythm game is tracked and accurate | ✅ **Met**, with caveats | Key presses are judged from the key event's own timestamp mapped onto the audio hardware clock, so frame rate doesn't affect judging. Unit-tested in `tests/rhythm-and-hitboxes.test.mjs` (window edges, accuracy formula, misses, no double hits). Caveats: on Safari and with Bluetooth audio the clock mapping is less exact and needs the manual offset; there's no automatic calibration. See [traps](#6-known-bugs-and-traps). |
| The projectiles have accurate hitboxes | ✅ **Met** | Every hitbox is a circle or capsule using the same numbers it's drawn with (`src/collision.js`). Moving shots are tested along their whole path each step, so fast ones can't skip through you. Unit-tested, including edge distances to within 1–2 units. `H` shows them in game. |

### Other spec items

| Spec item | Status | Notes |
| --- | --- | --- |
| Character movement | ✅ Done | Plus MOBA-style edge-pan camera. |
| Different projectiles to dodge | ✅ Done | Six types, see above. |
| Rhythm game on QWER, falling tiles | ✅ Done | |
| Surviving longer with >80% accuracy gives points | ✅ Done | Uses **≥** 80%, not strictly over. Change `>=` in `src/game.js` `update()` if that matters. |
| Upload a **YouTube / Spotify link** and auto-generate a map | ❌ **Not met** | A static web page can't get audio from YouTube or Spotify: they block cross-site downloads (CORS), Spotify streams are DRM-protected, and both forbid it in their terms. It would need a server-side downloader. What exists instead: upload any **audio file** (or a direct CORS-enabled audio link) and the map is generated automatically by beat detection. The link box detects YouTube/Spotify URLs and explains this to the player. |

---

## 4. Code map

Everything is in `src/`. Entry point is `index.html` → `src/main.js`.

### Where to go to change...

| I want to change... | Go to |
| --- | --- |
| Any number: speeds, HP, spawn rates, unlock times, timing windows, scoring, volume | `src/config.js` (start here, almost all tuning lives in `CONFIG`) |
| What a projectile looks like or how it moves | `src/projectiles.js`, the class for that type |
| Which projectiles spawn, where, and how often | `src/projectiles.js`, `Spawner` (and `CONFIG.spawner`) |
| How hits are detected | `src/collision.js` (maths), each projectile's `hits()` method, and `Game.update()` / `Game.hurt()` in `src/game.js` |
| Player movement or what happens when hit | `src/player.js`, `Game.hurt()` |
| Rhythm judging, accuracy, misses, combo | `src/rhythm.js`, `RhythmGame.press()` and `record()` |
| How the rhythm lanes look | `src/rhythm.js`, `RhythmGame.draw()` |
| How points are earned | `Game.update()` in `src/game.js` (bottom), `CONFIG.scoring` |
| Key bindings | `Game.handleInput()` in `src/game.js`; lane keys are `LANE_KEYS` in `src/rhythm.js` |
| Audio sync / latency | `src/audio.js` (`sync()`, `songTime()`) |
| How songs become tile maps | `src/beatmap.js`, `generateBeatmap()` and `DIFFICULTY` |
| The demo song | `src/demoSong.js` |
| Menus, file upload, link loading, game over text | `index.html` (markup), `src/ui.js` (behavior), `style.css` (looks) |
| Score / HP / accuracy panel, off-screen arrows | `src/hud.js` |
| Camera panning | `src/camera.js` |
| Background / arena | `src/world.js` |

### File by file

**`index.html`** — The canvas plus three HTML overlays: main menu (difficulty, demo button, file picker, link box, audio offset setting), pause screen, and game over screen.

**`style.css`** — Full-screen canvas and overlay/panel styling.

**`src/main.js`** — Creates the `Game`, wires up the UI, starts the loop. Exposes `window.game` for poking at state in the browser console.

**`src/config.js`** — `CONFIG`: every tuning value in one place (world size, player, camera, fixed timestep, each projectile type, spawner ramp and unlock times, rhythm windows and approach time, scoring threshold, volume).

**`src/game.js`** — `Game`, the hub.
- State machine: `menu` → `playing` ⇄ `paused` → `gameover` → `playing`/`menu` (`setState`, `startRun`, `restart`, `pause`, `resume`, `quitToMenu`, `gameOver`).
- `frame()`: the `requestAnimationFrame` loop. Runs the simulation at a fixed 120 Hz step (`update()`) and drives the rhythm game from the audio clock.
- `handleInput()`: turns queued input events into actions (right-click move, QWER presses, hotkeys).
- `update(dt)`: one fixed step. Moves player and projectiles, checks hits, removes dead projectiles, adds score.
- `hurt()`: HP loss, invulnerability, red flash, game over.
- `render()`: draws world, projectiles, player, then the screen-space rhythm lanes and HUD. `drawHitboxes()` is the `H` debug view.
- Saves best score to `localStorage` under `hw7-best`.

**`src/input.js`** — `Input`: tracks mouse position, right button, held keys, and queues one-shot events (`rightclick`, `keydown` with its exact timestamp). Disables the right-click menu. Ignores typing in the menu's text boxes. Pins the cursor at the window edge when it leaves so edge-panning keeps working.

**`src/camera.js`** — `Camera`: top-left world position of the view, edge panning, clamping to the world, `screenToWorld()`.

**`src/player.js`** — `Player`: position, walk target, speed, HP, invulnerability timer, circular hitbox, drawing.

**`src/collision.js`** — Pure geometry: `circleHitsCircle`, `circleHitsCapsule`, `distSqPointSegment`.

**`src/projectiles.js`**
- `Projectile` (base): straight-line movement with max travel distance; remembers its previous position for swept hit tests.
- `Bullet`, `Boulder` (big slow bullet), `Arrow` (capsule), `Homing` (turns toward player for a while), `Laser` (warning phase, then active beam; not a `Projectile` subclass).
- `Spawner`: timing (ramps up with survival time), weighted random type choice among unlocked types, spawn position on a ring just outside the screen around the player.

**`src/rhythm.js`** — `RhythmGame`: holds the chart, repeats it forever (`ensureNotes`), marks late tiles as misses (`update`), judges key presses (`press`), keeps stats/accuracy/combo (`record`, `accuracy`, `gateAccuracy`), and draws the lanes (`draw`). `LANE_KEYS` = `['q','w','e','r']`.

**`src/audio.js`** — `AudioEngine`: Web Audio context, decoding, looped playback scheduled ahead of time (`start`, `scheduleAhead`), and the **song clock**. `sync()` maps the audio hardware clock to `performance.now()` each frame; `songTime(t)` turns any event timestamp into song time, minus the user's audio offset.

**`src/beatmap.js`** — `generateBeatmap()`: audio samples → tile chart. Mono + downsample, FFT, spectral flux in 4 frequency bands, adaptive threshold peak picking, minimum gap per difficulty, lane = which band jumped most (bass = Q … treble = R). Pure JS, runs in Node.

**`src/demoSong.js`** — `generateDemoSong()`: synthesizes a 128 BPM drum/bass/lead track and its exact chart from a fixed seed. Pure JS, runs in Node.

**`src/hud.js`** — `drawHud()` (score, time, accuracy, scoring status, judgement counts, combo, HP, song title), `drawOffscreenWarnings()` (edge arrows), `formatTime()`.

**`src/ui.js`** — `setupUi()`: shows/hides the overlays on state change, game over results, and the menu actions (demo, file upload → decode → beatmap → start, link loading, YouTube/Spotify message).

**`src/effects.js`** — `MoveMarker`: the shrinking ring where you right-clicked.

**`src/world.js`** — `drawWorld()`: arena floor, grid, red border. The arena is 3000 × 2000 units.

**`tests/`** — Plain Node scripts, see [Run the tests](#run-the-tests-optional-needs-nodejs-18).

---

## 5. What I'd do next (in priority order)

1. **Make `main` the default branch on GitHub** (Settings → General → Default branch). Right now visitors and plain `git clone` land on an old branch with only `spec.md`.
2. **Accuracy over a recent window instead of the whole run.** One bad start currently locks you out of scoring for a long time, which makes "survive longer" feel unfair. It's already built in: set `CONFIG.scoring.accuracyWindow` to e.g. `30` and playtest.
3. **Offset calibration screen.** A short "tap along to the beat" step that sets the audio offset automatically. This is the biggest remaining threat to "accuracy is accurate" on Safari and Bluetooth audio.
4. **Move beat detection to a Web Worker** with a progress bar, so long songs don't freeze the page while the map is generated.
5. **Real YouTube/Spotify support** if it's still wanted: a small server that downloads audio (e.g. via `yt-dlp`) and hands it to the existing beatmap code. Spotify is effectively impossible because of DRM; YouTube is possible but against its terms of service.
6. **Use physical key positions (`e.code`)** for QWER so the left-hand layout works on AZERTY/QWERTZ keyboards.
7. **Balance pass**: spawn ramp, laser frequency, whether projectiles should wait until the countdown ends, beatmap density on Hard.
8. **Polish**: sound effects for hits/damage, a separate song-time display, settings saved between sessions, a cap on the beatmap for very long files.

---

## 6. Known bugs and traps

**Setup traps**
- **The GitHub default branch isn't `main`.** See install step. Clone with `--branch main`.
- **Opening `index.html` from disk shows a blank page.** Must be served over HTTP.
- **`python3` isn't a command on Windows.** Use `py` or `python`.

**Gameplay / timing**
- **Whole-run accuracy is unforgiving.** Missing the first few tiles drops accuracy to 0% and it takes a long streak to climb back over 80%. Not a bug, but it reads like one. Fix: `CONFIG.scoring.accuracyWindow` (see next steps #2).
- **Audio latency varies by device.** Chrome/Edge/Firefox use `AudioContext.getOutputTimestamp()` and are accurate. Browsers without it (notably Safari) fall back to an estimate from `outputLatency`/`baseLatency`, which can be off by tens of ms. Bluetooth headphones add 100–250 ms. The fix is the Audio offset setting; there's no auto-calibration yet.
- **Ghost taps aren't penalized.** Pressing a key with no tile nearby does nothing, so mashing never gives a Miss. Mashing still only reaches about 55–60% accuracy (mostly "Good"), which is under the 80% scoring threshold, so it isn't an exploit. Set `CONFIG.rhythm.ghostTapIsMiss = true` to punish it.
- **Non-QWERTY keyboards.** Lanes read the typed character (`e.key`), so on AZERTY the lanes are A Z E R in a different physical spot. Same for `S`, `Y`, `H`, `P`.
- **Survival time and projectiles start during the 3 s countdown**, before the first note. The first shot can arrive just before the music starts.
- **Scoring threshold is ≥ 80%**, while spec.md says "over 80%".

**Camera / input**
- **Edge-pan keeps going when the cursor leaves the window** (by design, to fix choppy top/bottom panning). If you move the mouse onto a second monitor, the camera keeps panning until you come back or the window loses focus.
- **The game pauses whenever the window loses focus**, including clicking the browser's address bar or a notification.

**Song loading**
- **Beat detection runs on the main thread.** A long file (10+ minutes) can freeze the page for several seconds while "Finding the beats..." is shown.
- **Direct links fail on most sites** because of CORS. An invalid URL also shows the CORS message, which is misleading.
- **Beat maps are approximate.** On the demo track the detector finds 100% of the melody notes on Easy/Normal and about 80% on Hard, within ~7 ms. Real songs with heavy reverb or no clear drums give sparser or noisier maps.

**Minor**
- Game over shows "New best!" if you exactly tie your previous best.
- If the browser blocks `localStorage` (some private-mode settings), the game fails to start because the best score is read in the `Game` constructor without a `try/catch`.
