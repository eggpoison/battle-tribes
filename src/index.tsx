import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Game from './Game';
import Camera from './Camera';
import Board from './Board';

import { Minimap } from './components/MinimapCanvas';
import PlayerControllerComponent, { stopPlayerMovement } from './entity-components/PlayerControllerComponent';
import { toggleMenu } from './components/menus/MenuManager';
import EntitySpawner from './EntitySpawner';

import "./css/index.css";
import "./css/devtools.css";
import "./css/inventory-viewer.css";
import "./css/message-display.css";
import "./css/tribe-stash-viewer.css";
import "./css/player-respawn-message.css";
import "./css/menus/crafting-menu.css";
import "./css/menus/mob-spawn-menu.css";

const root = ReactDOM.createRoot(
   document.getElementById('root') as HTMLElement
);
root.render(
   <React.StrictMode>
      <App />
   </React.StrictMode>
);

// Stop movement on right click
document.addEventListener("contextmenu", () => {
   stopPlayerMovement();
});

const setupHotkeys = (): void => {
   PlayerControllerComponent.createKeyListener("e", () => {
      toggleMenu("crafting");
   });
}

// Called when all elements are rendered
export function load() {
   Camera.setup();
   EntitySpawner.setup();
   Board.setup();
   Minimap.setup();
   Minimap.drawBackground();
   Game.startGame();

   setupHotkeys();
}