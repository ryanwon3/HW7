import { generateDemoSong } from './demoSong.js';
import { generateBeatmap } from './beatmap.js';
import { formatTime } from './hud.js';
import { CONFIG } from './config.js';

// Wires the HTML menus (start, pause, game over) to the game.
export function setupUi(game) {
  const $ = (id) => document.getElementById(id);
  const screens = { menu: $('menu'), paused: $('pause'), gameover: $('gameover') };
  const status = $('status');
  const difficulty = () => $('difficulty').value;
  let busy = false;

  const setStatus = (msg, isError = false) => {
    status.textContent = msg;
    status.classList.toggle('error', isError);
  };

  game.onStateChange = (state) => {
    for (const [name, el] of Object.entries(screens)) el.classList.toggle('hidden', name !== state);
    // Keep Enter/Space from re-pressing whatever button was focused.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (state === 'gameover') showResults();
    if (state === 'menu') setStatus('');
  };

  function showResults() {
    const r = game.rhythm;
    const c = r.stats.counts;
    const counts = CONFIG.rhythm.windows.map((w) => `${w.name} ${c[w.name]}`).join(' · ');
    const newBest = Math.floor(game.score) >= game.best && game.score > 0;
    $('results').innerHTML = `
      <div class="big">${Math.floor(game.score).toLocaleString()} pts</div>
      <div>${newBest ? 'New best!' : `Best: ${game.best.toLocaleString()}`}</div>
      <div>Survived ${formatTime(game.survived)}</div>
      <div>Accuracy ${(r.accuracy * 100).toFixed(2)}% over ${r.stats.judged} notes</div>
      <div>${counts} · Miss ${c.Miss}</div>
      <div>Max combo ${r.stats.maxCombo}</div>`;
  }

  function begin(song) {
    game.audio.userOffsetMs = Number($('offset').value) || 0;
    game.startRun(song);
  }

  async function withBusy(fn) {
    if (busy) return;
    busy = true;
    for (const b of document.querySelectorAll('#menu button, #menu input')) b.disabled = true;
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setStatus(err.message || String(err), true);
    } finally {
      busy = false;
      for (const b of document.querySelectorAll('#menu button, #menu input')) b.disabled = false;
    }
  }

  $('play-demo').addEventListener('click', () => withBusy(async () => {
    game.audio.ensureContext(); // must happen inside the click for autoplay rules
    const demo = generateDemoSong(44100, difficulty());
    const buffer = game.audio.bufferFromSamples(demo.samples, demo.sampleRate);
    begin({ buffer, chart: demo.chart, title: demo.chart.title });
  }));

  // Decode audio, run beat detection, start the game.
  async function playAudioData(arrayBuffer, title) {
    setStatus('Decoding audio...');
    const buffer = await game.audio.decode(arrayBuffer);
    setStatus('Finding the beats...');
    await new Promise((r) => setTimeout(r, 30)); // let the status text paint
    const channels = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
    const t0 = performance.now();
    const map = generateBeatmap(channels, buffer.sampleRate, difficulty());
    console.log(`Beatmap: ${map.notes.length} tiles in ${Math.round(performance.now() - t0)}ms`);
    if (map.notes.length < 4) throw new Error('Could not find enough beats in that audio to make a map.');
    begin({ buffer, chart: { ...map, title }, title });
  }

  $('file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    withBusy(async () => {
      game.audio.ensureContext();
      await playAudioData(await file.arrayBuffer(), file.name.replace(/\.[^.]+$/, ''));
    });
    e.target.value = '';
  });

  $('load-link').addEventListener('click', () => withBusy(async () => {
    const url = $('link').value.trim();
    if (!url) {
      setStatus('Paste a link first.', true);
      return;
    }
    if (/youtube\.com|youtu\.be|spotify\.com|spotify:/i.test(url)) {
      // A static web page can't get the audio for these: YouTube and Spotify
      // don't allow other sites to download their streams (CORS, DRM and their
      // terms of service), and doing it needs a server-side downloader.
      setStatus(
        "YouTube and Spotify links can't be loaded directly: those sites don't let other web pages download their audio. "
        + 'Use an audio file of the song instead (the file picker above) and the map is generated the same way.',
        true,
      );
      return;
    }
    game.audio.ensureContext();
    setStatus('Downloading...');
    let res;
    try {
      res = await fetch(url);
    } catch {
      throw new Error("That site doesn't allow downloads from other pages (CORS). Download the file and use the file picker instead.");
    }
    if (!res.ok) throw new Error(`Download failed (${res.status}).`);
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Linked song');
    await playAudioData(await res.arrayBuffer(), name.replace(/\.[^.]+$/, ''));
  }));

  $('resume').addEventListener('click', () => game.resume());
  $('pause-quit').addEventListener('click', () => game.quitToMenu());
  $('restart').addEventListener('click', () => game.restart());
  $('over-menu').addEventListener('click', () => game.quitToMenu());
}
