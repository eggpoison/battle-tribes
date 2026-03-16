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

const TXT_CONNECT = "Connecting to server...";
const TXT_SEND = "Sending player data...";
const TXT_INIT = "Initialising game...";

const loadingScreenElem = document.getElementById("loading-screen")!;
const textNode = document.getElementById("ls-text")!.firstChild as Text;

document.getElementById("ls-reconnect-button")!.addEventListener("click", () => {
   establishNewNetworkConnection(playerUsername, playerTribe.tribeType, isSpectating, onSuccessfulConnection, onFailedConnection, onPacket);

   loadingScreenElem.classList.remove("is-error");
   textNode.data = TXT_CONNECT;
});
document.getElementById("ls-main-menu-button")!.addEventListener("click", () => {
   closeLoadingScreen();
   openMainMenu();

   // Reset the text state back to the initial text
   textNode.data = TXT_CONNECT;
});

function onSuccessfulConnection(username: string, tribeType: TribeType, isSpectating: boolean): void {
   setLoadingScreenStage(LoadingScreenStage.sendingPlayerData);
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
   // Assume that the loading screen is in a non-error state, and in the "connecting" text state.
   loadingScreenElem.classList.remove("hidden");
}

export function openLoadingScreenFromNotMainMenu(): void {
   loadingScreenElem.classList.add("is-error");
   
   if (loadingScreenElem.classList.contains("hidden")) {
      loadingScreenElem.classList.remove("hidden");
      closeGameScreen();
   }
}

export function quitGame(): void {
   killSocket();

   closeGameScreen();
   openMainMenu();
}

// @Speed: can ensure difference
export function setLoadingScreenStage(stage: LoadingScreenStage): void {
   loadingScreenElem.classList.remove("hidden");

   if (stage === LoadingScreenStage.connectionError) {
      loadingScreenElem.classList.add("is-error");
      return;
   }

   loadingScreenElem.classList.remove("is-error");
   
   switch (stage) {
      case LoadingScreenStage.establishingConnection: textNode.data = "Connecting to server..."; break;
      case LoadingScreenStage.sendingPlayerData:      textNode.data = "Sending player data..."; break;
      case LoadingScreenStage.initialisingGame:       textNode.data = "Initialising game..."; break;
   }
}

export function closeLoadingScreen(): void {
   loadingScreenElem.classList.add("hidden");
}