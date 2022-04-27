import './App.css';
import Canvas from './components/Canvas';
import Devtools from './components/Devtools';
import MinimapCanvas from './components/MinimapCanvas';

function App() {
   return (
      <div className="App">
         <Canvas />
         <MinimapCanvas />
         <Devtools />
      </div>
   );
}

export default App;
