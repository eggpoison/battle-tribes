import { TribeType } from "battletribes-shared/tribes";
import { useEffect, useRef, useState } from "react";
import Client from "../client/Client";
import Game from "../Game";
import { AppState } from "./App";
import { definiteGameState } from "../game-state/game-states";
import { processGameDataPacket } from "../client/packet-processing";
import Camera from "../Camera";

// @Cleanup: This file does too much logic on its own. It should really only have UI/loading state

export const enum LoadingScreenStatus {
   establishingConnection,
   sendingPlayerData,
   initialisingGame,
   connectionError
}

interface LoadingScreenProps {
   readonly username: string;
   readonly tribeType: TribeType;
   setAppState(appState: AppState): void;
}
const LoadingScreen = (props: LoadingScreenProps) => {
   const [status, setStatus] = useState(LoadingScreenStatus.establishingConnection);
   const hasStarted = useRef(false);
   const hasLoaded = useRef(false);

   const openMainMenu = (): void => {
      props.setAppState(AppState.mainMenu);
   }

   const reconnect = (): void => {
      hasStarted.current = false;
      setStatus(LoadingScreenStatus.establishingConnection);
   }

   useEffect(() => {
      (async () => {
         if (hasLoaded.current) {
            return;
         }
         hasLoaded.current = true;

         // 
         // Establish connection with server
         // 

         const connectionWasSuccessful = await Client.connectToServer(props.setAppState, setStatus);
         if (connectionWasSuccessful) {
            setStatus(LoadingScreenStatus.sendingPlayerData);
         } else {
            setStatus(LoadingScreenStatus.connectionError);
            return;
         }
         
         Client.sendInitialPlayerData(props.username, props.tribeType);

         // 
         // Initialise game
         // 
         
         const initialGameDataPacket = await Client.getInitialGameDataPacket();
         setStatus(LoadingScreenStatus.initialisingGame);
         
         Game.playerID = initialGameDataPacket.playerID;
         
         await Game.initialise(initialGameDataPacket);
               
         Camera.setPosition(initialGameDataPacket.spawnPosition[0], initialGameDataPacket.spawnPosition[1]);
         Camera.setInitialVisibleChunkBounds();
         
         definiteGameState.playerUsername = props.username;
         
         Client.sendActivatePacket();
         
         const gameDataPacket = await Client.getNextGameDataPacket();
         processGameDataPacket(gameDataPacket);

         // @Temporary
         // Game.tribe = new Tribe(gameDataPacket.playerTribeData.name, gameDataPacket.playerTribeData.id, tribeType, gameDataPacket.playerTribeData.numHuts);
         
         // @Incomplete
         // const spawnPosition = Point.unpackage(initialGameDataPacket.spawnPosition);
         // Player.createInstancePlayer(spawnPosition, initialGameDataPacket.playerID);
         
         // Client.processGameDataPacket(gameDataPacket);

         Game.start();

         props.setAppState(AppState.game);
      })();
   }, []);

   if (status === LoadingScreenStatus.connectionError) {
      return <div id="loading-screen">
         <div className="content">
            <h1 className="title">Connection closed</h1>
            
            <div className="loading-message">
               <p>Connection with server failed.</p>

               <button onClick={reconnect}>Reconnect</button>
               <button onClick={openMainMenu}>Back</button>
            </div>
         </div>
      </div>;
   }

   return <div id="loading-screen">
      <div className="content">
         <h1 className="title">Loading</h1>

         {status === LoadingScreenStatus.establishingConnection ? <>
            <div className="loading-message">
               <p>Connecting to server...</p>
            </div>
         </> : status === LoadingScreenStatus.sendingPlayerData ? <>
            <div className="loading-message">
               <p>Sending player data...</p>
            </div>
         </> : status === LoadingScreenStatus.initialisingGame ? <>
            <div className="loading-message">
               <p>Initialising game...</p>
            </div>
         </> : null}
      </div>
   </div>;
}

export default LoadingScreen;