import { EntityType } from "webgl-test-shared/dist/entities";
import { InventoryName } from "webgl-test-shared/dist/items";
import Entity from "../../../Entity";
import { InventoryComponentArray, getInventory } from "../../../components/InventoryComponent";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "../../../components/TribeComponent";
import { TribeMemberComponentArray } from "../../../components/TribeMemberComponent";
import { getItemGiftAppreciation, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";

export function getGiftableItemSlot(tribesman: Entity): number {
   // @Incomplete: don't gift items useful to the tribesman
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   let maxGiftWeight = 0;
   let bestItemSlot = 0;
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }

      const giftWeight = getItemGiftAppreciation(item.type);
      if (giftWeight > maxGiftWeight) {
         maxGiftWeight = giftWeight;
         bestItemSlot = itemSlot;
      }
   }

   return bestItemSlot;
}

export function getRecruitTarget(tribesman: Entity, visibleEntities: ReadonlyArray<Entity>): Entity | null {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
   
   let maxRelationship = -100;
   let closestAcquaintance: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (entity.type === EntityType.player || !TribeMemberComponentArray.hasComponent(entity.id) || getEntityRelationship(tribesman.id, entity) === EntityRelationship.enemy) {
         continue;
      }

      // Don't try to gift items to tribesman who are already in an established tribe
      const tribeComponent = TribeComponentArray.getComponent(entity.id);
      if (tribeComponent.tribe.hasTotem()) {
         continue;
      }
      
      const relationship = tribesmanComponent.tribesmanRelations[entity.id] || 0;
      if (relationship > maxRelationship) {
         maxRelationship = relationship;
         closestAcquaintance = entity;
      }
   }
   
   return closestAcquaintance;
}