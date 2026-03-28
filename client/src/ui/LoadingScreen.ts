import { PacketReader, PacketType, TribeType } from "../../../shared/src";
import { receivePacket, gameIsRunning, canStartGame, startGame, stopGame } from "../game/game";
import { processDevGameDataPacket } from "../game/networking/dev-packets";
import { establishNewNetworkConnection, killSocket } from "../game/networking/networking";
import { processSyncGameDataPacket, processForcePositionUpdatePacket, receiveChatMessagePacket, processSimulationStatusUpdatePacket, processShieldKnockPacket, processInitialGameDataPacket } from "../game/networking/packet-receiving";
import { sendActivatePacket, sendInitialPlayerDataPacket } from "../game/networking/packet-sending/packet-sending";
import { playerUsername, isSpectating, setIsSpectating, setPlayerUsername, setPlayerInstance } from "../game/player";
import { setupRendering } from "../game/rendering/render";
import { playerTribe } from "../game/tribes";
import { windowHeight, windowWidth } from "../game/webgl";
import { closeGameScreen, openGameScreen } from "./GameScreen";
import { openMainMenu } from "./MainMenu";

export const enum LoadingScreenStage {
   establishingConnection,
   sendingPlayerData,
   initialisingGame,
   connectionError
}

const TXT_STAGE_1 = "Connecting to server...";
const TXT_STAGE_2 = "Sending player data...";
const TXT_STAGE_3 = "Initialising game...";

const loadingScreenElem = document.getElementById("loading-screen")!;
const textNode = document.getElementById("ls-text")!.firstChild as Text;

{
   const reconnectBtn = document.getElementById("ls-reconnect-button")!;

   // Reconnect button
   reconnectBtn.onclick = () => {
      establishNewNetworkConnection(playerUsername, playerTribe.tribeType, isSpectating, onSuccessfulConnection, onFailedConnection, onPacket);

      loadingScreenElem.className = "";
      textNode.data = TXT_STAGE_1;
   };
   // Main menu button
   (reconnectBtn.nextSibling as HTMLElement).onclick = () => {
      closeLoadingScreen();
      openMainMenu();

      textNode.data = TXT_STAGE_1;
   };
}

function onSuccessfulConnection(username: string, tribeType: TribeType, isSpectating: boolean): void {
   textNode.data = TXT_STAGE_2;

   sendInitialPlayerDataPacket(username, tribeType, isSpectating, windowWidth, windowHeight);

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

   textNode.data = TXT_STAGE_3;
   
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
      case PacketType.gameData: {
         receivePacket(reader);
         // Once enough packets are received to show the gameplay, start the game
         if (!gameIsRunning && canStartGame()) {
            closeLoadingScreen();
            openGameScreen();
            startGame();
         }
         break;
      }
      case PacketType.syncGameData: processSyncGameDataPacket(reader); break;
      case PacketType.forcePositionUpdate: processForcePositionUpdatePacket(reader); break;
      case PacketType.serverToClientChatMessage: receiveChatMessagePacket(reader); break;
      case PacketType.simulationStatusUpdate: processSimulationStatusUpdatePacket(reader); break;
      case PacketType.devGameData: processDevGameDataPacket(reader); break;
      case PacketType.shieldKnock: processShieldKnockPacket(); break;
   }
}

export function openLoadingScreenFromMainMenu(username: string, tribeType: TribeType, isSpectating: boolean): void {
   establishNewNetworkConnection(username, tribeType, isSpectating, onSuccessfulConnection, onFailedConnection, onPacket);
   // @Cleanup: main menu close function is called from outside this function, but that isn't that obvious from here... it looks like the loading screen is just being toggled on with the main menu staying open too...
   // Assume that the loading screen is in a non-error state, and in the "connecting" text state.
   loadingScreenElem.hidden = false;
}

export function openLoadingScreenFromNotMainMenu(): void {
   loadingScreenElem.className = "is-error";
   
   if (loadingScreenElem.hidden) {
      loadingScreenElem.hidden = false;
      closeGameScreen();
   }
}

export function closeLoadingScreen(): void {
   loadingScreenElem.hidden = true;
}

export function quitGame(): void {
   killSocket();

   closeGameScreen();
   openMainMenu();
}