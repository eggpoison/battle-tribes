import { EntityDebugData } from "../../../shared/src/client-server-types";
import { Tile } from "../game/Tile";

let tile: Tile | null = null;
let entityDebugData: EntityDebugData | null = null;

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