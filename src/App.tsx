import './App.css';
import Canvas from './components/Canvas';
import Devtools from './components/Devtools';
// import Inventory from './components/InventoryViewerManager';
import MessageDisplay from './components/MessageDisplay';
import MinimapCanvas from './components/MinimapCanvas';
import PlayerInventoryViewer from './components/PlayerInventoryViewer';
import TribeStashViewer from './components/TribeStashViewer';

function App() {
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
