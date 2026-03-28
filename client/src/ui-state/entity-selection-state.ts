import { Entity } from "webgl-test-shared";
import { entityExists, getEntityType } from "../game/world";
import { sendStructureUninteractPacket } from "../game/networking/packet-sending/packet-sending";
import { updateHighlightedEntityRenderObject } from "../game/entity-selection";
import { getEntityComponentArrays } from "../game/entity-component-types";

let selectedEntityScreenPosX = 0;
let selectedEntityScreenPosY = 0;

export const entitySelectionState = {
   get selectedEntityScreenPosX() {
      return selectedEntityScreenPosX;
   },
   setSelectedEntityScreenPosX(newSelectedEntityScreenPosX: number) {
      selectedEntityScreenPosX = newSelectedEntityScreenPosX;
   },
   get selectedEntityScreenPosY() {
      return selectedEntityScreenPosY;
   },
   setSelectedEntityScreenPosY(newSelectedEntityScreenPosY: number) {
      selectedEntityScreenPosY = newSelectedEntityScreenPosY;
   },

   // @SQUEAM should be called when game screen is closed!
   reset() {
      // @Cleanup: is awkward to have to do this. Would like for these to be reset implicitally (somehow have the state be tied to a component? idk)
      this.setHoveredEntity(null);
      this.setHighlightedEntity(null);
      this.setSelectedEntity(null);
   }
}