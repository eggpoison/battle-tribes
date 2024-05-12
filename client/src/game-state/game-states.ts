import { ITEM_TYPE_RECORD } from "webgl-test-shared/dist/items";
import Player from "../entities/Player";
import DefiniteGameState from "./DefiniteGameState";
import LatencyGameState from "./LatencyGameState";

export const definiteGameState = new DefiniteGameState();
export const latencyGameState = new LatencyGameState();

export function playerIsHoldingHammer(): boolean {
   if (Player.instance === null || definiteGameState.hotbar === null) return false;

   if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
      const item = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
      return ITEM_TYPE_RECORD[item.type] === "hammer";
   } 
   return false;
}