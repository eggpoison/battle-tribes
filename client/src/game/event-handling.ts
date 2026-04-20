import { Settings } from "../../../shared/src";
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

let wasdBitfield = 0;
let arrowBitfield = 0;

export function getPlayerMoveDirection(): number | null {
   const bitfield = wasdBitfield | arrowBitfield;
   switch (bitfield) {
      case 0:  return null;
      case 1:  return 0;
      case 2:  return Math.PI * 3/2;
      case 3:  return Math.PI * 7/4;
      case 4:  return Math.PI;
      case 5:  return null;
      case 6:  return Math.PI * 5/4;
      case 7:  return Math.PI * 3/2;
      case 8:  return Math.PI / 2;
      case 9:  return Math.PI / 4;
      case 10: return null;
      case 11: return 0;
      case 12: return Math.PI * 3/4;
      case 13: return Math.PI / 2;
      case 14: return Math.PI;
      case 15: return null;
      default: {
         if (__DEV__) {
            console.warn("Unknown player movement input!");
         }
         return null;
      }
   }
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

function scrollHotbarSelectedItemSlot(e: WheelEvent): void {
   // Don't scroll hotbar if element is being scrolled instead
   // @SPEED there MUST be a faster way. attaching it to a different DOM element or something.
   const elemPath = e.composedPath() as Array<HTMLElement>;
   for (const elem of elemPath) {
      // @Hack
      if (elem.style !== undefined) {
         const overflowY = getComputedStyle(elem).getPropertyValue("overflow-y");
         if (overflowY === "scroll") {
            return;
         }
      }
   }
   
   const scrollDirection = Math.sign(e.deltaY);
   const newSlot = getHotbarSelectedItemSlot() + scrollDirection;
   const newSlotWrapped = (newSlot + Settings.INITIAL_PLAYER_HOTBAR_SIZE) % Settings.INITIAL_PLAYER_HOTBAR_SIZE;
   selectItemSlot(newSlotWrapped);
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

function onWStart(): void {
   wasdBitfield |= 1;
}

function onWEnd(): void {
   wasdBitfield &= ~1;
}

function onAStart(): void {
   wasdBitfield |= 2;
}

function onAEnd(): void {
   wasdBitfield &= ~2;
}

function onSStart(): void {
   wasdBitfield |= 4;
}

function onSEnd(): void {
   wasdBitfield &= ~4;
}

function onDStart(): void {
   wasdBitfield |= 8;
}

function onDEnd(): void {
   wasdBitfield &= ~8;
}

function onArrowUpStart(): void {
   arrowBitfield |= 1;
}

function onArrowUpEnd(): void {
   arrowBitfield &= ~1;
}

function onArrowLeftStart(): void {
   arrowBitfield |= 2;
}

function onArrowLeftEnd(): void {
   arrowBitfield &= ~2;
}

function onArrowDownStart(): void {
   arrowBitfield |= 4;
}

function onArrowDownEnd(): void {
   arrowBitfield &= ~4;
}

function onArrowRightStart(): void {
   arrowBitfield |= 8;
}

function onArrowRightEnd(): void {
   arrowBitfield &= ~8;
}

export function onKeyDown(e: KeyboardEvent): void {
   if (e.repeat) {
      return;
   }

   switch (e.keyCode) {
      case ASCIICode.SHIFT:  onShiftStart(); break;
      case ASCIICode.ESCAPE: closeCurrentMenu(); break;
      case ASCIICode.SPACE: ascendLayer(); break;
      case ASCIICode.ARROW_LEFT: onArrowLeftStart(); break;
      case ASCIICode.ARROW_UP: onArrowUpStart(); break;
      case ASCIICode.ARROW_RIGHT: onArrowRightStart(); break;
      case ASCIICode.ARROW_DOWN: onArrowDownStart(); break;
      case ASCIICode.ONE: selectItemSlot(1); break;
      case ASCIICode.TWO: selectItemSlot(2); break;
      case ASCIICode.THREE: selectItemSlot(3); break;
      case ASCIICode.FOUR: selectItemSlot(4); break;
      case ASCIICode.FIVE: selectItemSlot(5); break;
      case ASCIICode.SIX: selectItemSlot(6); break;
      case ASCIICode.SEVEN: selectItemSlot(7); break;
      case ASCIICode.A: onAStart(); break;
      case ASCIICode.D: onDStart(); break;
      case ASCIICode.E: openCraftingMenu(); break;
      case ASCIICode.L: if (__DEV__) { onLStart(); } break;
      case ASCIICode.O: if (__DEV__) { toggleCinematicMode(); } break;
      case ASCIICode.P: toggleTechTree(); break;
      case ASCIICode.Q: dropItem(); break;
      case ASCIICode.S: onSStart(); break;
      case ASCIICode.T: openChatMessageInput(e); break;
      case ASCIICode.W: onWStart(); break;
      case ASCIICode.TILDE: if (__DEV__) { openTerminal(); } break;
      case ASCIICode.GRAVE: if (__DEV__) { toggleNerdVision(); } break;
   }
}

export function onKeyUp(e: KeyboardEvent): void {
   switch (e.keyCode) {
      case ASCIICode.SHIFT: onShiftEnd(); break;
      case ASCIICode.ARROW_LEFT: onArrowLeftEnd(); break;
      case ASCIICode.ARROW_UP: onArrowUpEnd(); break;
      case ASCIICode.ARROW_RIGHT: onArrowRightEnd(); break;
      case ASCIICode.ARROW_DOWN: onArrowDownEnd(); break;
      case ASCIICode.A: onAEnd(); break;
      case ASCIICode.D: onDEnd(); break;
      case ASCIICode.L: if (__DEV__) { onLEnd(); } break;
      case ASCIICode.S: onSEnd(); break;
      case ASCIICode.W: onWEnd(); break;
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
   document.onvisibilitychange = e => { console.log(e); onVisibilityChange() };
   window.onresize = onWindowResize;
   // These three are outcasts :(
   document.body.addEventListener("wheel", scrollHotbarSelectedItemSlot, { passive: true });
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