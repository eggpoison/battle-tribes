import './App.css';
import Canvas from './components/Canvas';
import Devtools from './components/Devtools';
import Inventory from './components/InventoryViewer';
import MinimapCanvas from './components/MinimapCanvas';

function App() {
   return (
      <div className="App">
         <Canvas />
         <MinimapCanvas />

         <Devtools />
         <Inventory />
      </div>
   );
}

export default App;
