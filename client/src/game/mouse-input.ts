import { Settings } from "webgl-test-shared/src/settings";
import { Tile } from "./Tile";
import { getTileIndexIncludingEdges, tileIsInWorld } from "./Layer";
import { getCurrentLayer } from "./world";
import { Point } from "../../../shared/src/utils";
import { screenToWorldPos } from "./camera";
import { hoverDebugState } from "../ui-state/hover-debug-state.svelte";

export const cursorScreenPos = new Point(0, 0);
export const cursorWorldPos = new Point(0, 0);

window.addEventListener("mousemove", e => {
   cursorScreenPos.x = e.clientX;
   cursorScreenPos.y = e.clientY;
   cursorWorldPos.set(screenToWorldPos(cursorScreenPos));
});

/**
 * Finds the entity the user is hovering over.
 */
export function getMouseTargetTile(): Tile | null {
   const tileX = Math.floor(cursorWorldPos.x / Settings.TILE_SIZE);
   const tileY = Math.floor(cursorWorldPos.y / Settings.TILE_SIZE);

   if (tileIsInWorld(tileX, tileY)) {
      const layer = getCurrentLayer();
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return layer.getTile(tileIndex);
   }
   return null;
}


// @Cleanup: Function name. This doesn't just render the cursor tooltip, it updates debug info.
// Maybe seperate this into two functions?
export function renderCursorTooltip(): void {
   const targetTile = getMouseTargetTile();
   hoverDebugState.setTile(targetTile);
 
   // @INCOMPLETE @SQUEAM
   
   // // Update the cursor tooltip
   // // @Hack
   // const transformComponent = TransformComponentArray.getComponent(targetEntity)!;
   // const hitbox = transformComponent.hitboxes[0];

   // // @Incomplete: doesn't account for render position
   // const entityScreenPos = worldToScreenPos(hitbox.box.position);

   // const debugData = hoverDebugState.entityDebugData;
   // if (debugData === null || targetEntity === debugData.entityID) {
   //    updateCursorTooltip(debugData, entityScreenPos.x, entityScreenPos.y);
   // }
}