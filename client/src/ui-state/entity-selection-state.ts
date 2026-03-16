import { Entity } from "webgl-test-shared";
import { entityExists, getEntityType } from "../game/world";
import { sendStructureUninteractPacket } from "../game/networking/packet-sending/packet-sending";
import { updateHighlightedEntityRenderInfo } from "../game/entity-selection";
import { menuSelectorState } from "./menu-selector-state";
import { getEntityComponentArrays } from "../game/entity-component-types";

let hoveredEntity: Entity = 0;
let highlightedEntity: Entity = 0;
let selectedEntity: Entity = 0;

let selectedEntityScreenPosX = 0;
let selectedEntityScreenPosY = 0;

export const entitySelectionState = {
   get hoveredEntity() {
      return entityExists(hoveredEntity) ? hoveredEntity : null;
   },
   setHoveredEntity(newHoveredEntity: Entity | null): void {
      hoveredEntity = newHoveredEntity !== null ? newHoveredEntity : 0;
   },

   get highlightedEntity() {
      return entityExists(highlightedEntity) ? highlightedEntity : null;
   },
   setHighlightedEntity(newHighlightedEntity: Entity | null): void {
      updateHighlightedEntityRenderInfo(newHighlightedEntity);
      highlightedEntity = newHighlightedEntity !== null ? newHighlightedEntity : 0;
   },

   get selectedEntity() {
      return entityExists(selectedEntity) ? selectedEntity : null;
   },
   setSelectedEntity(newSelectedEntity: Entity | null): void {
      // If there was a previous entity selected, and it's being changed, deselect the entity.
      if (entityExists(selectedEntity) && newSelectedEntity !== selectedEntity) {
         // @Location @Hack @Cleanup
         sendStructureUninteractPacket(selectedEntity);

         // Done as a wee bit of a hack so that this doesn't get into an infinite loop with closeCurrentMenu (they call each other)
         selectedEntity = 0; 

         menuSelectorState.closeCurrentMenu();
      }

      if (newSelectedEntity !== null && entityExists(newSelectedEntity)) {
         selectedEntity = newSelectedEntity;

         // Update UI state
         const componentArrays = getEntityComponentArrays(getEntityType(selectedEntity));
         for (const componentArray of componentArrays) {
            componentArray.updateSelectedEntityState?.(selectedEntity);
         }
      } else {
         selectedEntity = 0;
      }
   },

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