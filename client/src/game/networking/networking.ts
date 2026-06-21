import { PacketReader, ServerPacketType } from "../../../../shared/src/packets";
import { closeGameScreen, gameScreenIsOpen, openGameScreen } from "../../ui/GameScreen";
import { setLoadingScreenStateToWaiting, openLoadingScreen, setLoadingScreenStateToError, setLoadingScreenStateToInitialising, closeLoadingScreen } from "../../ui/LoadingScreen";
import { startGame, stopGame, updateGame } from "../game";
import { playerUsername, playerTribeType, isSpectating } from "../player";
import { initialiseGame } from "../rendering/render";
import { windowWidth, windowHeight } from "../webgl";
import { onDevGameDataPacket } from "./dev-packets";
import { processInitialGameDataPacket, onSyncGameDataPacket, onForcePositionUpdatePacket, onChatMessagePacket, onSimulationStatusUpdatePacket, onShieldKnockPacket } from "./packet-receiving";
import { sendInitialPlayerDataPacket } from "./packet-sending/packet-sending";
import { createSocket } from "./socket";
import { bufferHasEnoughForGameStart, onGameDataPacket } from "./snapshots";
import { gameIsFocused } from "../event-handling";

export function establishNewNetworkConnection(): void {
   createSocket(onPacket, onSuccessfulConnection, onFailedConnection);
}

function onSuccessfulConnection(): void {
   sendInitialPlayerDataPacket(playerUsername, playerTribeType, isSpectating, windowWidth, windowHeight);
   
   setLoadingScreenStateToWaiting();
}

function onFailedConnection(): void {
   if (gameScreenIsOpen()) {
      stopGame();
      
      closeGameScreen();
      openLoadingScreen();
   }

   setLoadingScreenStateToError();
}

const monitorPacketBuffer = (time: number): void => {
   // Once enough packets are received and initialisation is complete, start the game
   if (bufferHasEnoughForGameStart()) {
      startGame(time);
   } else {
      requestAnimationFrame(monitorPacketBuffer);
   }
}

async function onInitialGameDataPacket(reader: PacketReader): Promise<void> {
   setLoadingScreenStateToInitialising();
   
   // Initialise game
   const intermediateInitialisationInfo = processInitialGameDataPacket(reader);
   await initialiseGame(intermediateInitialisationInfo).then(() => {
      requestAnimationFrame(monitorPacketBuffer);
   });
}

function onPacket(msg: MessageEvent<ArrayBuffer>): void {
   // @SPEED: new reader every time!!
   // @Speed: always zero, so parameter not needed
   const reader = new PacketReader(msg.data, 0);
   
   const packetType: ServerPacketType = reader.readNumber();
   switch (packetType) {
      case ServerPacketType.initialGameData:        void onInitialGameDataPacket(reader); break;
      case ServerPacketType.gameData: {
         // @CLEANUP!!: had to break the single-function-call-per-case for this :(
         
         onGameDataPacket(reader);

         // When the game isn't focused, there is no animation loop to consume snapshots. So this has to be done to keep the game state updated and prevent snapshots from queuing up endlessly.
         // @BUG: If gameIsFocused changes mid-frame, updateGame could be called twice
         if (!gameIsFocused) {
            updateGame();
         }
         break;
      }
      case ServerPacketType.syncGameData:           onSyncGameDataPacket(reader); break;
      case ServerPacketType.devGameData:            onDevGameDataPacket(reader); break;
      case ServerPacketType.forcePositionUpdate:    onForcePositionUpdatePacket(reader); break;
      case ServerPacketType.chatMessage:            onChatMessagePacket(reader); break;
      case ServerPacketType.simulationStatusUpdate: onSimulationStatusUpdatePacket(reader); break;
      case ServerPacketType.shieldKnock:            onShieldKnockPacket(); break;
      default: {
         if (__DEV__) console.warn(`Received unknown packet type: ${packetType}`);
      }
   }
}