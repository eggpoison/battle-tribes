import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../../../Entity";
import { InventoryComponentArray, getInventory } from "../../../components/InventoryComponent";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "../../../components/TribeComponent";
import { TribeMemberComponentArray } from "../../../components/TribeMemberComponent";
import { getItemGiftAppreciation, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { InventoryName } from "webgl-test-shared/dist/items/items";

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
   
   let maxRelations = -100;
   let closestAcquaintance: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (entity.type === EntityType.player || !TribeMemberComponentArray.hasComponent(entity.id)) {
         continue;
      }

      // Don't try to recuit enemies or tribesmen already in the same tribe
      const relationship = getEntityRelationship(tribesman.id, entity);
      if (relationship === EntityRelationship.friendly || relationship === EntityRelationship.enemy) {
         continue;
      }

      // Don't try to gift items to tribesman who are already in an established tribe
      const tribeComponent = TribeComponentArray.getComponent(entity.id);
      if (tribeComponent.tribe.hasTotem()) {
         continue;
      }
      
      const relations = tribesmanComponent.tribesmanRelations[entity.id] || 0;
      if (relations > maxRelations) {
         maxRelations = relationship;
         closestAcquaintance = entity;
      }
   }
   
   return closestAcquaintance;
}