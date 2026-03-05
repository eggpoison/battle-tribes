import { PacketReader, PacketType, TribeType, Settings } from "../../../../shared/src";
import { closeGameScreen } from "../../ui/GameScreen";
import { setLoadingScreenStage, LoadingScreenStage, openLoadingScreenFromNotMainMenu } from "../../ui/LoadingScreen";
import { openMainMenu } from "../../ui/MainMenu";
import { onGameDataPacket, stopGame } from "../game";
import { setPlayerUsername, setIsSpectating, setPlayerInstance } from "../player";
import { setupRendering } from "../rendering/render";
import { createAudioContext } from "../sound";
import { processDevGameDataPacket } from "./dev-packets";
import { processSyncGameDataPacket, processForcePositionUpdatePacket, receiveChatMessagePacket, processSimulationStatusUpdatePacket, processShieldKnockPacket, processInitialGameDataPacket } from "./packet-receiving";
import { sendInitialPlayerDataPacket, sendActivatePacket } from "./packet-sending/packet-sending";

let socket: WebSocket | null = null;

export function getNetworkBufferedBytes(): number {
   return socket?.bufferedAmount || -1;
}

function onSuccessfulConnection(username: string, tribeType: TribeType, isSpectating: boolean): void {
   setLoadingScreenStage(LoadingScreenStage.sendingPlayerData);
   sendInitialPlayerDataPacket(username, tribeType, isSpectating);

   setPlayerUsername(username);
   setIsSpectating(isSpectating);
}

function onFailedConnection(): void {
   stopGame();
   openLoadingScreenFromNotMainMenu();
   setPlayerInstance(null); // @Cleanup: why?
}

async function onInitialGameDataPacket(reader: PacketReader): Promise<void> {
   processInitialGameDataPacket(reader);
   
   // Initialise game

   setLoadingScreenStage(LoadingScreenStage.initialisingGame);
   
   await setupRendering();
   
   sendActivatePacket();
}

async function onPacket(msg: MessageEvent): Promise<void> {
   if (document.hidden) {
      return;
   }
   
   const reader = new PacketReader(msg.data as ArrayBufferLike, 0);
   
   const packetType = reader.readNumber() as PacketType;
   switch (packetType) {
      case PacketType.initialGameData: await onInitialGameDataPacket(reader); break;
      case PacketType.gameData: onGameDataPacket(reader); break;
      case PacketType.syncGameData: processSyncGameDataPacket(reader); break;
      case PacketType.forcePositionUpdate: processForcePositionUpdatePacket(reader); break;
      case PacketType.serverToClientChatMessage: receiveChatMessagePacket(reader); break;
      case PacketType.simulationStatusUpdate: processSimulationStatusUpdatePacket(reader); break;
      case PacketType.devGameData: processDevGameDataPacket(reader); break;
      case PacketType.shieldKnock: processShieldKnockPacket(); break;
   }
}

export function establishNetworkConnection(username: string, tribeType: TribeType, isSpectating: boolean): void {
   if (socket !== null) {
      return;
   }
   
   // @SQUEAM
   // socket = new WebSocket(`ws://10.0.0.10:${Settings.SERVER_PORT}`);
   // Use 127.0.0.1 instea of localhost cuz localhost sometimes breaks it for reasons
   socket = new WebSocket(`ws://127.0.0.1:${Settings.SERVER_PORT}`);
   socket.binaryType = "arraybuffer";

   socket.onopen = (): void => { onSuccessfulConnection(username, tribeType, isSpectating); };
   socket.onclose = onFailedConnection;
   socket.onmessage = onPacket;

   // This is guaranteed to have occurred after a mouse press
   // @Cleanup: location!
   createAudioContext();
}

export function reconnectClient(username: string, tribeType: TribeType, isSpectating: boolean): void {
   socket = null;
   establishNetworkConnection(username, tribeType, isSpectating);
}

export function quitGame(): void {
   closeGameScreen();
   openMainMenu();
   
   if (socket !== null) {
      socket.close();
      socket = null;
   }
}

export function sendData(buffer: ArrayBufferLike): void {
   socket?.send(buffer);
}