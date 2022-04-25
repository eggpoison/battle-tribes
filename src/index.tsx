import React from 'react';
import ReactDOM from 'react-dom/client';
import './css/index.css';
import App from './App';
import Game from './Game';
import Camera from './Camera';
import Board from './Board';
import { drawMinimap } from './components/MinimapCanvas';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

window.addEventListener("load", () => {
   Camera.setup();
   Board.setup();
   Game.startGame();

   drawMinimap(); 
});