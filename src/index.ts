// =============================-===--======- -    -
// Babylon.js 5.x Typescript Template
//
// Initial Loading Boilerplate
// ===========================-===--======- -    -

import 'babylonjs-loaders';
import { Game } from './game';

// Wait until the scene is fully loaded,
// then run the game main loop.
window.addEventListener('DOMContentLoaded', () => {
  console.log("Loading...");

  // create game instance
  let game = new Game('renderCanvas');

  // when createScene() finishes loading,
  // it will return a promise
  // and we will finally run the game
  game.createScene().then(() => {
    console.log("Running...");
    game.run();
  });
});
