import { useEffect, useRef } from 'react';
import { load } from '.';
import Canvas from './components/Canvas';
import Devtools from './components/Devtools';
import MessageDisplay from './components/MessageDisplay';
import MinimapCanvas from './components/MinimapCanvas';
import PlayerInventoryViewer from './components/PlayerInventoryViewer';
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

         <Devtools />
         <PlayerInventoryViewer />
         <MessageDisplay />
         <TribeStashViewer />
      </div>
   );
}

export default App;
