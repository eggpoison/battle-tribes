import { Entity } from "webgl-test-shared/src/entities";
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
   setSelectedEntity(newSelectedEntity: Entity): void {
      selectedEntity = newSelectedEntity;
   },
   deselectSelectedEntity(): void {
      // Clear previous selected entity
      if (entityExists(selectedEntity)) {
         selectedEntity = 0;

         sendStructureUninteractPacket(selectedEntity);
         closeCurrentMenu();
      }
   },

   reset() {
      this.setHoveredEntity(null);
      this.deselectSelectedEntity();
   }
}