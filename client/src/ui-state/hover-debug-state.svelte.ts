import { Tile } from "../game/Tile";
import { EntityDebugData } from "webgl-test-shared/src/client-server-types";

let tile = $state<Tile | null>(null);
let entityDebugData = $state<EntityDebugData | null>(null);

export const hoverDebugState = {
   get tile() {
      return tile;
   },
   setTile(newTile: Tile | null): void {
      tile = newTile;
   },

   get entityDebugData() {
      return entityDebugData;
   },
   setEntityDebugData(newEntityDebugData: EntityDebugData | null): void {
      entityDebugData = newEntityDebugData;
   }
};