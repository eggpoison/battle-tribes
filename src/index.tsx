import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import Game from './Game';
import Camera from './Camera';
import Board from './Board';
import EntitySpawner from './EntitySpawner';
import Tribe from './Tribe';
import { Minimap } from './components/MinimapCanvas';
import Mouse from './Mouse';


const root = ReactDOM.createRoot(
   document.getElementById('root') as HTMLElement
);
root.render(
   <React.StrictMode>
      <App />
   </React.StrictMode>
);

// export function onLoad(callback: () => void): void {

// }

// Called when all elements are rendered
export function load() {
   Camera.setup();
   EntitySpawner.setup();
   Board.setup();
   Tribe.spawnTribes();
   Minimap.setup();
   Minimap.drawBackground();
   Game.startGame();
   Mouse.setup();
}