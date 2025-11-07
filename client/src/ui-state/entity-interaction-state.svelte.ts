import { Entity } from "webgl-test-shared";
import { entityExists } from "../game/world";
import { sendStructureUninteractPacket } from "../game/networking/packet-sending";
import { closeCurrentMenu } from "../game/menus";

let hoveredEntity = $state<Entity>(0);
let selectedEntity = $state<Entity>(0);

export const entityInteractionState = {
   get hoveredEntity() {
      return entityExists(hoveredEntity) ? hoveredEntity : null;
   },
   setHoveredEntity(newHoveredEntity: Entity | null): void {
      hoveredEntity = newHoveredEntity !== null ? newHoveredEntity : 0;
   },

   get selectedEntity() {
      return entityExists(selectedEntity) ? selectedEntity : null;
   },
   setSelectedEntity(newSelectedEntity: Entity | null): void {
      if (newSelectedEntity !== null && entityExists(newSelectedEntity)) {
         // Clear previous selected entity
         if (entityExists(selectedEntity)) {
            selectedEntity = 0;

            sendStructureUninteractPacket(selectedEntity);
            closeCurrentMenu();
         }

         selectedEntity = newSelectedEntity;
      } else {
         selectedEntity = 0;
      }
   },

   reset() {
      this.setHoveredEntity(null);
      this.setSelectedEntity(null);
   }
}