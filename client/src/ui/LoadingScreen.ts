import { PacketReader, PacketType, TribeType } from "../../../shared/src";
import { receivePacket, gameIsRunning, bufferHasEnoughForGameStart, startGame, stopGame } from "../game/game";
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

const TXT_CONNECTING = "Connecting to server...";
const TXT_WAITING = "Waiting for data...";
const TXT_INITIALISING = "Initialising game...";

const loadingScreenElem = document.getElementById("loading-screen")!;
const textNode = document.getElementById("ls-text")!.firstChild as Text;

// Init button events
{
   const reconnectButton = document.getElementById("ls-reconnect-button")!;

   reconnectButton.onclick = () => {
      establishNewNetworkConnection(playerUsername, playerTribe.tribeType, isSpectating, onSuccessfulConnection, onFailedConnection, onPacket);

      loadingScreenElem.className = "";
      textNode.data = TXT_CONNECTING;
   };

   const mainMenuButton = reconnectButton.nextElementSibling as HTMLElement;
   mainMenuButton.onclick = () => {
      closeLoadingScreen();
      openMainMenu();

      textNode.data = TXT_CONNECTING;
   };
}

function onSuccessfulConnection(username: string, tribeType: TribeType, isSpectating: boolean): void {
   sendInitialPlayerDataPacket(username, tribeType, isSpectating, windowWidth, windowHeight);
   
   setPlayerUsername(username);
   setIsSpectating(isSpectating);
   
   textNode.data = TXT_WAITING;
}

function onFailedConnection(): void {
   if (gameIsRunning) {
      stopGame();
      closeGameScreen();
      setPlayerInstance(null); // @Cleanup: why?

      loadingScreenElem.hidden = false;
   }

   loadingScreenElem.className = "is-error";
}

async function onInitialGameDataPacket(reader: PacketReader): Promise<void> {
   textNode.data = TXT_INITIALISING;
   
   // Initialise game
   processInitialGameDataPacket(reader);
   await setupRendering();
   sendActivatePacket();
}

// @Location
function onPacket(msg: MessageEvent): void {
   // @Bug potentially: what if this fires for the initial game data packet somehow?
   if (document.hidden) {
      return;
   }
   
   const reader = new PacketReader(msg.data as ArrayBufferLike, 0);
   
   const packetType = reader.readNumber() as PacketType;
   switch (packetType) {
      case PacketType.initialGameData: {
         void onInitialGameDataPacket(reader);
         break;
      }
      case PacketType.gameData: {
         receivePacket(reader);
         
         // Once enough packets are received to show the gameplay, start the game
         // @Speed: This only happens once, and then the hot path runs this check every single time!!!
         if (!gameIsRunning && bufferHasEnoughForGameStart()) {
            closeLoadingScreen();
            openGameScreen();
            startGame();
         }
         break;
      }
      case PacketType.syncGameData: {
         processSyncGameDataPacket(reader);
         break;
      }
      case PacketType.forcePositionUpdate: {
         processForcePositionUpdatePacket(reader);
         break;
      }
      case PacketType.serverToClientChatMessage: {
         receiveChatMessagePacket(reader);
         break;
      }
      case PacketType.simulationStatusUpdate: {
         processSimulationStatusUpdatePacket(reader);
         break;
      }
      case PacketType.devGameData: {
         processDevGameDataPacket(reader);
         break;
      }
      case PacketType.shieldKnock: {
         processShieldKnockPacket();
         break;
      }
   }
}

export function openLoadingScreenFromMainMenu(username: string, tribeType: TribeType, isSpectating: boolean): void {
   establishNewNetworkConnection(username, tribeType, isSpectating, onSuccessfulConnection, onFailedConnection, onPacket);
   // @Cleanup: main menu close function is called from outside this function, but that isn't that obvious from here... it looks like the loading screen is just being toggled on with the main menu staying open too...
   // Assume that the loading screen is in a non-error state, and in the "connecting" text state.
   loadingScreenElem.hidden = false;
}

function closeLoadingScreen(): void {
   loadingScreenElem.hidden = true;
}

// @Location
export function quitGame(): void {
   killSocket();

   closeGameScreen();
   openMainMenu();
}