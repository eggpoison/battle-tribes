import { LoadingScreenStatus } from "./LoadingScreen";
type GameState = "main_menu" | "loading" | "game";
export declare let setGameState: (gameState: GameState) => Promise<void>;
export declare let getGameState: () => GameState;
export declare let setLoadingScreenInitialStatus: (newStatus: LoadingScreenStatus) => void;
export declare let resetUsername: () => void;
declare function App(): import("react/jsx-runtime").JSX.Element;
export default App;
