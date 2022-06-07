import { useEffect, useRef } from 'react';
import { load } from '.';
import Canvas from './components/Canvas';
import Devtools from './components/Devtools';
import HealthBar from './components/HealthBar';
import MenuManager from './components/menus/MenuManager';
import MessageDisplay from './components/MessageDisplay';
import MinimapCanvas from './components/MinimapCanvas';
import PlayerInventoryViewer from './components/inventory/PlayerInventoryViewer';
import PlayerRespawnMessage from './components/PlayerRespawnMessage';
import TribeStashViewer from './components/inventory/TribeStashViewer';
import TribeXPBar from './components/TribeXPBar';

import "./css/index.css";
import "./css/devtools.css";
import "./css/inventory-viewer.css";
import "./css/message-display.css";
import "./css/tribe-stash-viewer.css";
import "./css/player-respawn-message.css";
import "./css/menus/crafting-menu.css";
import "./css/menus/mob-spawn-menu.css";
import "./css/tribe-xp-bar.css";

function App() {
   const hasLoaded = useRef<boolean>(false);

   useEffect(() => {
      if (!hasLoaded.current) {
         load();
         hasLoaded.current = true;
      }
   }, []);

   return (
      <div className="App">
         <Canvas />
         <MinimapCanvas />

         <HealthBar />
         <PlayerInventoryViewer />

         <Devtools />
         <MessageDisplay />
         <TribeStashViewer />
         <MenuManager />
         <PlayerRespawnMessage />
         <TribeXPBar />

         {/* Black filter */}
         <div id="mask" className="hidden"></div>
         {/* Yellow border around screen in unit selection mode */}
         <div id="unit-selection-mode-border" className="hidden"></div>
         {/* Entity health */}
         <div id="entity-health" className="hidden"></div>
      </div>
   );
}

export default App;
