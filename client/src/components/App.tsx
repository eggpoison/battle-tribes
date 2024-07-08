import { TribeType } from "webgl-test-shared/dist/tribes";
import { useEffect, useRef, useState } from "react";
import GameScreen from "./game/GameScreen";
import LoadingScreen, { LoadingScreenStatus } from "./LoadingScreen";
import MainMenu from "./MainMenu";
import FrameGraph from "./game/dev/FrameGraph";
import { GameInteractState } from "../Game";

type GameState = "main_menu" | "loading" | "game";

export let setGameState: (gameState: GameState) => Promise<void>;
export let getGameState: () => GameState;

export let App_setGameInteractState: (interactState: GameInteractState) => void;

export let setLoadingScreenInitialStatus: (newStatus: LoadingScreenStatus) => void;

export let resetUsername: () => void;

function App() {
   const [interactState, setInteractState] = useState(GameInteractState.none);
   
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

      App_setGameInteractState = (interactState: GameInteractState): void => {
         setInteractState(interactState);
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
         <GameScreen interactState={interactState} />
      </> : null}

      <div id="canvas-wrapper" className={!canvasIsVisible ? "hidden" : undefined}>
         <canvas id="game-canvas" className={interactState === GameInteractState.summonEntity ? "summoning-entity" : undefined}></canvas>
         <div id="game-canvas-vignette" className={interactState === GameInteractState.summonEntity ? "summoning-entity" : undefined}></div>
         <canvas id="text-canvas"></canvas>
         <canvas id="tech-tree-canvas" className="hidden"></canvas>
         <FrameGraph />
      </div>
   </>;
}

export default App;
