import { TribeType } from "battletribes-shared/tribes";
import { useRef, useState } from "react";
import GameScreen from "./game/GameScreen";
import LoadingScreen from "./LoadingScreen";
import FrameGraph from "./game/dev/FrameGraph";
import MainMenu from "./MainMenu";

export const enum AppState {
   mainMenu,
   loading,
   game
}

function App() {
   const usernameRef = useRef("");
   const tribeTypeRef = useRef(TribeType.plainspeople);
   const [appState, setAppState] = useState(AppState.mainMenu);

   console.log(1);
   
   return <>
      {appState === AppState.mainMenu ? <>
         <MainMenu existingUsername={usernameRef.current} usernameRef={usernameRef} tribeTypeRef={tribeTypeRef} setAppState={setAppState} />
      </> : appState === AppState.loading ? <>
         <LoadingScreen username={usernameRef.current} tribeType={tribeTypeRef.current} setAppState={setAppState} />
      </> : appState === AppState.game ? <>
         <GameScreen setAppState={setAppState} />
      </> : null}

      <div id="canvas-wrapper" className={appState !== AppState.game ? "hidden" : undefined}>
         <canvas id="game-canvas"></canvas>
         <canvas id="text-canvas"></canvas>
         <canvas id="tech-tree-canvas" className="hidden"></canvas>
         <FrameGraph />
      </div>
   </>;
}

export default App;
