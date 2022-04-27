import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Game from './Game';
import Camera from './Camera';
import Board from './Board';

import './css/index.css';
import "./css/devtools.css";

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
});