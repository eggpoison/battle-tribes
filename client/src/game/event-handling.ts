import { Point, Settings } from "../../../shared/src";
import { gameUIState } from "../ui-state/game-ui-state";
import { nerdVision } from "../ui-state/nerd-vision-funcs";
import { openChatMessageInput } from "../ui/game/Chat";
import { closeCurrentMenu, hasOpenNonEmbodiedMenu, MenuType, openMenu, toggleMenu } from "../ui/menus";
import { updateCursorScreenPos } from "./camera";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { sendAscendPacket, sendDismountCarrySlotPacket, sendItemDropPacket } from "./networking/packet-sending/packet-sending";
import { playerInstance } from "./player";
import { getHotbarSelectedItemSlot, getSelectedItemInfo, selectItemSlot } from "./player-action-handling";
import { resetFrameGraph } from "./rendering/webgl/frame-graph-rendering";
import { preventDefault } from "./utils";
import { onWindowResize } from "./webgl";
import { entityExists } from "./world";

const enum ASCIICode {
   SHIFT = 16,       // Shift key
   ESCAPE = 27,      // Escape key
   SPACE = 32,       // Space key
   ARROW_LEFT = 37,  // Left arrow
   ARROW_UP = 38,    // Up arrow
   ARROW_RIGHT = 39, // Right arrow
   ARROW_DOWN = 40,  // Down arrow
   ONE = 49,         // 1
   TWO = 50,         // 2
   THREE = 51,       // 3
   FOUR = 52,        // 4
   FIVE = 53,        // 5
   SIX = 54,         // 6
   SEVEN = 55,       // 7
   EIGHT = 56,       // 8
   NINE = 57,        // 9
   A = 65,           // A
   D = 68,           // D
   E = 69,           // E
   L = 76,           // L
   O = 79,           // O
   P = 80,           // P
   Q = 81,           // Q
   S = 83,           // S
   T = 84,           // T
   W = 87,           // W
   CARET = 94,       // ^
   TILDE = 126,      // ~
   GRAVE = 192       // `
}

/*
 @INCOMPLETE?
   // If the player is holding an item when their inventory is closed, throw the item out
   if (playerInstance !== null) {
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
      const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
      if (heldItemInventory.hasItem(1)) {
         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = transformComponent.hitboxes[0];
         sendItemDropPacket(InventoryName.heldItemSlot, 1, 99999, playerHitbox.box.angle);
      }
   }

   */

export let gameIsFocused = true;

export let shiftIsPressed = false;
export let playerIsLightspeed = false;

let movementBitfield = 0;
let moveInputVec = new Point(0, 0);
let moveInputDir = -999;

function updatePlayerInputInfo(bit: number, isStart: boolean): void {
   if (isStart) {
      movementBitfield |= bit;
   } else {
      movementBitfield &= ~bit;
   }
   
   const xBits = movementBitfield & 0b0101;
   const yBits = (movementBitfield & 0b1010) >> 1;

   let xMov = (xBits >> 2) - (xBits & 1);
   let yMov = (yBits >> 2) - (yBits & 1);

   let dir = xMov * 2;

   // Diagonals
   if (xMov !== 0 && yMov !== 0) {
      dir -= yMov * xMov;

      // Normalise diagonal movement
      xMov *= Math.SQRT1_2;
      yMov *= Math.SQRT1_2;
   } else {
      dir += yMov === -1 ? 4 : 0;
   }

   moveInputVec.x = xMov;
   moveInputVec.y = yMov;
   
   if (xMov !== 0 || yMov !== 0) {
      dir *= Math.PI / 4;
      moveInputDir = dir;
   } else {
      moveInputDir = -999;
   }
}

export function getPlayerInputVector(): Readonly<Point> {
   return moveInputVec;
}

export function getPlayerInputDirection(): number {
   return moveInputDir;
}

function onMouseMove(e: MouseEvent): void {
   gameUIState.setCursorX(e.clientX);
   gameUIState.setCursorY(e.clientY);
   updateCursorScreenPos(e);
}

function openCraftingMenu(): void {
   const didCloseMenu = closeCurrentMenu();
   if (!didCloseMenu) {
      openMenu(MenuType.craftingMenu);
   }
}

function dropItem(): void {
   if (playerInstance === null) {
      return;
   }
   
   const selectedItemInfo = getSelectedItemInfo();
   if (selectedItemInfo === null) {
      return;
   }

   const playerTransformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = playerTransformComponent.hitboxes[0];
   
   const dropAmount = shiftIsPressed ? 99999 : 1;
   sendItemDropPacket(selectedItemInfo.inventoryName, getHotbarSelectedItemSlot(), dropAmount, playerHitbox.box.angle);
}

function ascendLayer(): void {
   if (gameUIState.canAscendLayer) {
      sendAscendPacket();
   }
}

function toggleTechTree(): void {
   toggleMenu(MenuType.techTree);
}

function toggleCinematicMode(): void {
   gameUIState.setCinematicModeIsEnabled(!gameUIState.cinematicModeIsEnabled);
}

function toggleNerdVision(): void {
   nerdVision.setIsVisible(!nerdVision.isVisible());
}

function openTerminal(): void {
   nerdVision.setIsVisible(true);
   nerdVision.setTerminalIsVisible(true);
}

export function scrollHotbarSelectedItemSlot(e: WheelEvent): void {
   let itemSlot = getHotbarSelectedItemSlot();
   if (e.deltaY > 0) {
      itemSlot++;
      if (itemSlot > Settings.INITIAL_PLAYER_HOTBAR_SIZE) {
         itemSlot -= Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      }
   } else if (e.deltaY < 0) {
      itemSlot--;
      if (itemSlot < 1) {
         itemSlot += Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      }
   }
   selectItemSlot(itemSlot);
}

function onVisibilityChange(): void {
   if (document.visibilityState === "visible") {
      gameIsFocused = true;
   } else {
      gameIsFocused = false;
      
      // @Cleanup: unnecessary??
      // So that when the player returns to the game the dev frame graph doesn't show a maaassive frame
      resetFrameGraph();
   }
}

function onShiftStart(): void {
   shiftIsPressed = true;
   
   // Dismount current mount if the player isn't shift clicking an item in an inventory
   if (!hasOpenNonEmbodiedMenu() && playerInstance !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerInstance);
      const playerHitbox = transformComponent.hitboxes[0];
      if (playerHitbox.parent !== null && entityExists(playerHitbox.parent.entity)) {
         sendDismountCarrySlotPacket();
      }
   }
}

function onShiftEnd(): void {
   shiftIsPressed = false;
}

function onLStart(): void {
   playerIsLightspeed = true;
}

function onLEnd(): void {
   playerIsLightspeed = false;
}

export function onKeyDown(e: KeyboardEvent): void {
   if (e.repeat) {
      return;
   }

   switch (e.keyCode) {
      case ASCIICode.SHIFT:  onShiftStart(); break;
      case ASCIICode.ESCAPE: closeCurrentMenu(); break;
      case ASCIICode.SPACE: ascendLayer(); break;
      case ASCIICode.ONE: selectItemSlot(1); break;
      case ASCIICode.TWO: selectItemSlot(2); break;
      case ASCIICode.THREE: selectItemSlot(3); break;
      case ASCIICode.FOUR: selectItemSlot(4); break;
      case ASCIICode.FIVE: selectItemSlot(5); break;
      case ASCIICode.SIX: selectItemSlot(6); break;
      case ASCIICode.SEVEN: selectItemSlot(7); break;
      case ASCIICode.A: updatePlayerInputInfo(1, true); break;
      case ASCIICode.D: updatePlayerInputInfo(4, true); break;
      case ASCIICode.E: openCraftingMenu(); break;
      case ASCIICode.L: if (__DEV__) { onLStart(); } break;
      case ASCIICode.O: if (__DEV__) { toggleCinematicMode(); } break;
      case ASCIICode.P: toggleTechTree(); break;
      case ASCIICode.Q: dropItem(); break;
      case ASCIICode.S: updatePlayerInputInfo(2, true); break;
      case ASCIICode.T: openChatMessageInput(e); break;
      case ASCIICode.W: updatePlayerInputInfo(8, true); break;
      case ASCIICode.TILDE: if (__DEV__) { openTerminal(); } break;
      case ASCIICode.GRAVE: if (__DEV__) { toggleNerdVision(); } break;
   }
}

export function onKeyUp(e: KeyboardEvent): void {
   switch (e.keyCode) {
      case ASCIICode.SHIFT: onShiftEnd(); break;
      case ASCIICode.A: updatePlayerInputInfo(1, false); break;
      case ASCIICode.D: updatePlayerInputInfo(4, false); break;
      case ASCIICode.L: if (__DEV__) { onLEnd(); } break;
      case ASCIICode.S: updatePlayerInputInfo(2, false); break;
      case ASCIICode.W: updatePlayerInputInfo(8, false); break;
   }
}

function onDocumentFocusIn(): void {
   // Disable key events when inputting text
   document.onkeydown = null;
   document.onkeyup = null;
}

function onDocumentFocusOut(): void {
   // Re-enable key events
   document.onkeydown = onKeyDown;
   document.onkeyup = onKeyUp;

   // @BUG investigate if in the item catalogue, when the player was holding shift before they entered text, stopped holding it after, and then clicked an item, it gives a stack of that item when it should give just 1.
}

export function setupEvents(): void {
   document.onkeydown = onKeyDown;
   document.onkeyup = onKeyUp;
   document.onmousemove = onMouseMove;
   document.onvisibilitychange = onVisibilityChange;
   window.onresize = onWindowResize;
   // These two are outcasts :(
   document.addEventListener("focusin", onDocumentFocusIn);
   document.addEventListener("focusout", onDocumentFocusOut);
  
   if (!__DEV__) {
      // This is prod-only so reloading modules functions without interrupt
      // @INCOMPLETE: actually DO do it for dev, but only for manual closes/refreshes!!
      window.onbeforeunload = preventDefault;
   }
}

export function cleanupEvents(): void {
   document.onkeydown = null;
   document.onkeyup = null;
   document.onmousemove = null;
   document.onvisibilitychange = null;
   window.onresize = null;
   document.body.removeEventListener("wheel", scrollHotbarSelectedItemSlot);
   document.removeEventListener("focusin", onDocumentFocusIn);
   document.removeEventListener("focusout", onDocumentFocusOut);

   window.onbeforeunload = null;
}