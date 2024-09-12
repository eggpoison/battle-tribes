import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { createPlayerInputListeners } from './player-input';

import "./css/index.css";
import "./css/main-menu.css";
import "./css/loading-screen.css";
import "./css/game/chatbox.css";
import "./css/game/menus/settings.css";
import "./css/game/death-screen.css";
import "./css/game/health-bar.css";
import "./css/game/inventories/inventory.css";
import "./css/game/inventories/hotbar.css";
import "./css/game/inventories/cooking-inventory.css";
import "./css/game/inventories/tribesman-inventory.css";
import "./css/game/inventories/barrel-inventory.css";
import "./css/game/inventories/backpack-inventory.css";
import "./css/game/inventories/tombstone-epitaph.css";
import "./css/game/inventories/ammo-box-inventory.css";
import "./css/game/charge-meter.css";
import "./css/game/menus/crafting-menu.css";
import "./css/game/nerd-vision/nerd-vision.css";
import "./css/game/nerd-vision/game-info-display.css";
import "./css/game/nerd-vision/cursor-tooltip.css";
import "./css/game/nerd-vision/terminal-button.css";
import "./css/game/nerd-vision/terminal.css";
import "./css/game/nerd-vision/debug-info.css";
import "./css/game/nerd-vision/frame-graph.css";
import "./css/game/tech-tree.css";
import "./css/game/tech-infocard.css";
import "./css/game/research-bench-caption.css";
import "./css/game/build-menu.css";
import "./css/game/inspect-health-bar.css";
import "./css/game/infocards.css";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const renderApp = (Component: React.FC) => {
  root.render(
    <React.StrictMode>
      <Component />
    </React.StrictMode>
  );
};

renderApp(App);

// Enable Hot Module Replacement (HMR)
if (module.hot) {
   module.hot.accept();
//   module.hot.accept('./components/App', () => {
//     const NextApp = require('./components/App').default;
//     renderApp(NextApp);
//   });
//   module.hot.accept(function () {
//     console.log('An error occurred while accepting new version');
//   });
}

window.addEventListener("load", () => {
   createPlayerInputListeners();
});