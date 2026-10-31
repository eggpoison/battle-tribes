import { Settings } from "../../../../../shared/src/settings";
import { cursorWorldPos } from "../../../game/camera";
import { getCurrentLayer } from "../../../game/world";
import { populateTileInspector } from "./tabs/TileInspector";

let cursorPosXNode: Text | null = null;
let cursorPosYNode: Text | null = null;

export function createDebugInspector(parent: HTMLElement): void {
   const rootElem = document.createElement("div");
   rootElem.id = "debug-info";

   const cursorPosElem = document.createElement("p");
   cursorPosElem.textContent = "Looking at pos ";

   const cursorPosXHighlightElem = document.createElement("span");
   cursorPosXHighlightElem.className = "highlight";
   cursorPosXHighlightElem.textContent = cursorWorldPos.x.toFixed(0);
   cursorPosXNode = cursorPosXHighlightElem.firstChild as Text;
   cursorPosElem.appendChild(cursorPosXHighlightElem)

   const spacingElem = document.createTextNode(" ");
   cursorPosElem.appendChild(spacingElem);

   const cursorPosYHighlightElem = document.createElement("span");
   cursorPosYHighlightElem.className = "highlight";
   cursorPosYHighlightElem.textContent = cursorWorldPos.y.toFixed(0);
   cursorPosYNode = cursorPosYHighlightElem.firstChild as Text;
   cursorPosElem.appendChild(cursorPosYHighlightElem)

   rootElem.appendChild(cursorPosElem);

   const layer = getCurrentLayer();
   
   const tileX = Math.floor(cursorWorldPos.x / Settings.TILE_SIZE);
   const tileY = Math.floor(cursorWorldPos.y / Settings.TILE_SIZE);
   const tile = layer.getTileXY(tileX, tileY);

   populateTileInspector(rootElem, layer, tile, tileX, tileY);
   
   parent.appendChild(rootElem);
}

export function updateDebugInspectorCursor(x: number, y: number): void {
   if (cursorPosXNode !== null) {
      cursorPosXNode.data = Math.floor(x) as unknown as string;
      cursorPosYNode!.data = Math.floor(y) as unknown as string;
   }
}