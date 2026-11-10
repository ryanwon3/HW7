import { Game } from './game.js';
import { setupUi } from './ui.js';

const game = new Game(document.getElementById('game'));
setupUi(game);
game.start();
// Exposed for debugging in the browser console.
window.game = game;
