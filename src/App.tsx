import { useEffect, useRef } from 'react';
import { load } from '.';
import Canvas from './components/Canvas';
import Devtools from './components/Devtools';
import HealthBar from './components/HealthBar';
import MenuManager from './components/menus/MenuManager';
import MessageDisplay from './components/MessageDisplay';
import MinimapCanvas from './components/MinimapCanvas';
import PlayerInventoryViewer from './components/PlayerInventoryViewer';
import PlayerRespawnMessage from './components/PlayerRespawnMessage';
import TribeStashViewer from './components/TribeStashViewer';

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

         {/* Black filter */}
         <div id="mask" className="hidden"></div>
      </div>
   );
}

export default App;
