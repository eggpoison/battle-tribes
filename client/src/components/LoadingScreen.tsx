import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point } from "webgl-test-shared/dist/utils";
import { useEffect, useRef, useState } from "react";
import Client from "../client/Client";
import Player from "../entities/Player";
import Game from "../Game";
import { setGameState, setLoadingScreenInitialStatus } from "./App";
import { definiteGameState } from "../game-state/game-states";
import Tribe from "../Tribe";

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
         
         const tiles = Client.parseServerTileDataArray(initialGameDataPacket.tiles);
         await Game.initialise(tiles, initialGameDataPacket.waterRocks, initialGameDataPacket.riverSteppingStones, initialGameDataPacket.riverFlowDirections, initialGameDataPacket.edgeTiles, initialGameDataPacket.edgeRiverFlowDirections, initialGameDataPacket.edgeRiverSteppingStones, initialGameDataPacket.grassInfo, initialGameDataPacket.decorations);
         
         definiteGameState.playerUsername = username;
         
         const gameDataPacket = await Client.getNextGameDataPacket();

         Game.tribe = new Tribe(gameDataPacket.playerTribeData.name, gameDataPacket.playerTribeData.id, tribeType, gameDataPacket.playerTribeData.numHuts);
         
         // @Incomplete
         // const spawnPosition = Point.unpackage(initialGameDataPacket.spawnPosition);
         // Player.createInstancePlayer(spawnPosition, initialGameDataPacket.playerID);
         
         Client.processGameDataPacket(gameDataPacket);

         Game.start();

         setGameState("game");
      })();
      // switch (status) {
      //    // case "establishing_connection": {
      //    //    if (!hasStarted.current) {
      //    //       hasStarted.current = true;

      //    //       // Why must react be this way, this syntax is a national tragedy
      //    //       (async () => {
      //    //          const connectionWasSuccessful = await Client.connectToServer();
      //    //          if (connectionWasSuccessful) {
      //    //             setStatus("sending_player_data");
      //    //          } else {
      //    //             setStatus("connection_error");
      //    //          }
      //    //       })();
      //    //    }

      //    //    break;
      //    // }
      //    case "sending_player_data": {
      //       Client.sendInitialPlayerData(username, tribeType);

      //       // setStatus("receiving_spawn_position");
      //       setStatus("initialising_game");
            
      //       break;
      //    }
      //    // case "receiving_spawn_position": {
      //    //    (async () => {
      //    //       spawnPositionRef.current = await Client.requestSpawnPosition();

      //    //       setStatus("sending_visible_chunk_bounds");
      //    //    })();

      //    //    break;
      //    // }
      //    // case "sending_visible_chunk_bounds": {
      //    //    const spawnPosition = spawnPositionRef.current!;
      //    //    Camera.setPosition(spawnPosition.x, spawnPosition.y);
      //    //    Camera.updateVisibleChunkBounds();
      //    //    Camera.updateVisibleRenderChunkBounds();
      //    //    Client.sendVisibleChunkBounds(Camera.getVisibleChunkBounds());

      //    //    setStatus("receiving_game_data");
            
      //    //    break;
      //    // }
      //    // case "receiving_game_data": {
      //    //    (async () => {
      //    //       initialGameDataPacketRef.current = await Client.requestInitialGameData();

      //    //       setStatus("initialising_game");
      //    //    })();

      //    //    break;
      //    // }
      //    case "initialising_game": {
      //       (async () => {
      //          // const initialGameDataPacket = initialGameDataPacketRef.current!;
      //          const initialGameDataPacket = await Client.getInitialGameDataPacket();
               
      //          const tiles = Client.parseServerTileDataArray(initialGameDataPacket.tiles);
      //          await Game.initialise(tiles, initialGameDataPacket.waterRocks, initialGameDataPacket.riverSteppingStones, initialGameDataPacket.riverFlowDirections, initialGameDataPacket.edgeTiles, initialGameDataPacket.edgeRiverFlowDirections, initialGameDataPacket.edgeRiverSteppingStones, initialGameDataPacket.grassInfo, initialGameDataPacket.decorations);
               
      //          definiteGameState.playerUsername = username;
               
      //          const gameDataPacket = await Client.getNextGameDataPacket();

      //          Game.tribe = new Tribe(gameDataPacket.playerTribeData.name, gameDataPacket.playerTribeData.id, tribeType, gameDataPacket.playerTribeData.numHuts);
               
      //          const spawnPosition = Point.unpackage(initialGameDataPacket.spawnPosition);
      //          Player.createInstancePlayer(spawnPosition, initialGameDataPacket.playerID);
               
      //          Client.processGameDataPacket(gameDataPacket);

      //          Game.start();

      //          setGameState("game");
      //       })();

      //       break;
      //    }
      // }
   }, [username, tribeType]);

   if (status === "connection_error") {
      return <div id="loading-screen">
         <div className="content">
            <h1 className="title">Error while connecting to server.</h1>
            
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
               <p>Establishing connection with server...</p>
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