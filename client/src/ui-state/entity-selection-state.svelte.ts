import { Entity } from "webgl-test-shared";
import { entityExists, getEntityComponentTypes } from "../game/world";
import { sendStructureUninteractPacket } from "../game/networking/packet-sending";
import { updateHighlightedEntityRenderInfo } from "../game/entity-selection";
import { getServerComponentArray } from "../game/entity-components/ComponentArray";
import { menuSelectorState } from "./menu-selector-state.svelte";

let hoveredEntity = $state<Entity>(0);
let highlightedEntity = $state<Entity>(0);
let selectedEntity = $state<Entity>(0);

let selectedEntityScreenPosX = $state(0);
let selectedEntityScreenPosY = $state(0);

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
      if (newSelectedEntity !== null && entityExists(newSelectedEntity)) {
         // Clear previous selected entity
         if (entityExists(selectedEntity)) {
            selectedEntity = 0;

            // @Location @Hack @Cleanup
            sendStructureUninteractPacket(selectedEntity);
            menuSelectorState.closeCurrentMenu();
         }

         selectedEntity = newSelectedEntity;

         // Update UI state
         const componentTypes = getEntityComponentTypes(selectedEntity);
         for (const componentType of componentTypes) {
            const componentArray = getServerComponentArray(componentType);
            if (typeof componentArray.updateSelectedEntityState !== "undefined") {
               componentArray.updateSelectedEntityState(selectedEntity);
            }
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

   reset() {
      // @Cleanup: is awkward to have to do this. Would like for these to be reset implicitally (somehow have the state be tied to a component? idk)
      this.setHoveredEntity(null);
      this.setHighlightedEntity(null);
      this.setSelectedEntity(null);
   }
}