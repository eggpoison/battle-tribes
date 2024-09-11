import { TribeType } from "battletribes-shared/tribes";
import { useEffect, useRef, useState } from "react";
import Client from "../client/Client";
import Game from "../Game";
import { setGameState, setLoadingScreenInitialStatus } from "./App";
import { definiteGameState } from "../game-state/game-states";
import { processGameDataPacket } from "../client/packet-processing";
import Camera from "../Camera";

// @Cleanup: This file does too much logic on its own. It should really only have UI/loading state

export type LoadingScreenStatus = "establishing_connection" | "sending_player_data" | "initialising_game" | "connection_error";

interface LoadingScreenProps {
   readonly username: string;
   readonly tribeType: TribeType;
   readonly initialStatus: LoadingScreenStatus;
}
const LoadingScreen = ({ username, tribeType, initialStatus }: LoadingScreenProps) => {
   const [status, setStatus] = useState<LoadingScreenStatus>(initialStatus);
   const hasStarted = useRef(false);
   const hasLoaded = useRef(false);

   const openMainMenu = (): void => {
      setLoadingScreenInitialStatus("establishing_connection");
      setGameState("main_menu");
   }

   const reconnect = (): void => {
      hasStarted.current = false;
      setStatus("establishing_connection");
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

         const connectionWasSuccessful = await Client.connectToServer();
         if (connectionWasSuccessful) {
            setStatus("sending_player_data");
         } else {
            setStatus("connection_error");
            return;
         }
         
         Client.sendInitialPlayerData(username, tribeType);

         // 
         // Initialise game
         // 
         
         const initialGameDataPacket = await Client.getInitialGameDataPacket();
         setStatus("initialising_game");
         
         Game.playerID = initialGameDataPacket.playerID;
         
         await Game.initialise(initialGameDataPacket);
               
         Camera.setPosition(initialGameDataPacket.spawnPosition[0], initialGameDataPacket.spawnPosition[1]);
         Camera.setInitialVisibleChunkBounds();
         
         definiteGameState.playerUsername = username;
         
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

         setGameState("game");
      })();
   }, [username, tribeType]);

   if (status === "connection_error") {
      return <div id="loading-screen">
         <div className="content">
            <h1 className="title">Connection closed</h1>
            
            <div className="loading-message">
               <p>Connection with server failed.</p>

               <button onClick={reconnect}>Reconnect</button>
               <button onClick={() => openMainMenu()}>Back</button>
            </div>
         </div>
      </div>;
   }

   return <div id="loading-screen">
      <div className="content">
         <h1 className="title">Loading</h1>

         {status === "establishing_connection" ? <>
            <div className="loading-message">
               <p>Connecting to server...</p>
            </div>
         </> : status === "sending_player_data" ? <>
            <div className="loading-message">
               <p>Sending player data...</p>
            </div>
         </> : status === "initialising_game" ? <>
            <div className="loading-message">
               <p>Initialising game...</p>
            </div>
         </> : null}
      </div>
   </div>;
}

export default LoadingScreen;