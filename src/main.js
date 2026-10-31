import { Game } from './game.js';

const game = new Game(document.getElementById('game'));
game.start();
// Exposed for debugging in the browser console.
window.game = game;
