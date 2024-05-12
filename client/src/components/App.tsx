import { TribeType } from "webgl-test-shared/dist/tribes";
import { useEffect, useRef, useState } from "react";
import GameScreen from "./game/GameScreen";
import LoadingScreen, { LoadingScreenStatus } from "./LoadingScreen";
import MainMenu from "./MainMenu";
import FrameGraph from "./game/dev/FrameGraph";

type GameState = "main_menu" | "loading" | "game";

export let setGameState: (gameState: GameState) => Promise<void>;
export let getGameState: () => GameState;

export let setLoadingScreenInitialStatus: (newStatus: LoadingScreenStatus) => void;

export let resetUsername: () => void;

function App() {
   const [gameSection, setGameSection] = useState<GameState>("main_menu");
   const gameStateUpdateCallbacks = useRef(new Array<() => void>());
   const usernameRef = useRef<string | null>(null);
   const tribeTypeRef = useRef<TribeType | null>(null);
   const initialLoadingScreenStatus = useRef<LoadingScreenStatus>("establishing_connection");
   const [canvasIsVisible, setCanvasVisiblity] = useState<boolean>(false);
      
   const showCanvas = (): void => setCanvasVisiblity(true);
   const hideCanvas = (): void => setCanvasVisiblity(false);
 
   useEffect(() => {
      resetUsername = (): void => {
         usernameRef.current = null;
      }
      
      setGameState = (gameState: GameState): Promise<void> => {
         return new Promise(resolve => {
            gameStateUpdateCallbacks.current.push(resolve);

            setGameSection(gameState);
         });
      }
   }, []);

   useEffect(() => {
      setLoadingScreenInitialStatus = (newStatus: LoadingScreenStatus): void => {
         initialLoadingScreenStatus.current = newStatus;
      }
   }, []);


   useEffect(() => {
      gameSection === "game" ? showCanvas() : hideCanvas();
   }, [gameSection]);

   const passUsername = (username: string): void => {
      usernameRef.current = username;
   }

   useEffect(() => {
      // Call all callbacks
      for (const callback of gameStateUpdateCallbacks.current) {
         callback();
      }
      gameStateUpdateCallbacks.current = [];
   }, [gameSection]);

   useEffect(() => {
      getGameState = (): GameState => gameSection;
   }, [gameSection]);

   return <>
      {gameSection === "main_menu" ? <>
         <MainMenu existingUsername={usernameRef.current} passUsername={(username: string) => passUsername(username)} passTribeType={(tribeType: TribeType) => { tribeTypeRef.current = tribeType }} />
      </> : gameSection === "loading" ? <>
         <LoadingScreen username={usernameRef.current!} tribeType={tribeTypeRef.current!} initialStatus={initialLoadingScreenStatus.current} />
      </> : gameSection === "game" ? <>
         <GameScreen />
      </> : null}

      <div id="canvas-wrapper" className={!canvasIsVisible ? "hidden" : undefined}>
         <canvas id="game-canvas"></canvas>
         <canvas id="text-canvas"></canvas>
         <canvas id="tech-tree-canvas" className="hidden"></canvas>
         <FrameGraph />
      </div>
   </>;
}

export default App;
