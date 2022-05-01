import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Game from './Game';
import Camera from './Camera';
import Board from './Board';

import "./css/index.css";
import "./css/devtools.css";
import "./css/inventory-viewer.css";
import "./css/message-display.css";
import "./css/tribe-stash-viewer.css";
import { precomputeTileLocations } from './tiles';
import { Minimap } from './components/MinimapCanvas';
import MobSpawning from './MobSpawning';

const root = ReactDOM.createRoot(
   document.getElementById('root') as HTMLElement
);
root.render(
   <React.StrictMode>
      <App />
   </React.StrictMode>
);

// Called when all elements are rendered
export function load() {
   Camera.setup();
   Board.setup();
   MobSpawning.setup();
   Minimap.setup();
   Minimap.drawBackground();
   precomputeTileLocations();
   Game.startGame();
}