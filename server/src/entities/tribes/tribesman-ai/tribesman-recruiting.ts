import { Entity, EntityType, InventoryName } from "battletribes-shared";
import { InventoryComponentArray, getInventory } from "../../../components/InventoryComponent.js";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "../../../components/TribeComponent.js";
import { TribeMemberComponentArray } from "../../../components/TribeMemberComponent.js";
import { getItemGiftAppreciation, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent.js";
import { getEntityType } from "../../../world.js";

export function getGiftableItemSlot(tribesman: Entity): number {
   // @Incomplete: don't gift items useful to the tribesman
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   let maxGiftWeight = 0;
   let bestItemSlot = 0;
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (item === undefined) {
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
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   
   let maxRelations = -100;
   let closestAcquaintance: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (getEntityType(entity) === EntityType.player || !TribeMemberComponentArray.hasComponent(entity)) {
         continue;
      }

      // Don't try to recuit enemies or tribesmen already in the same tribe
      const relationship = getEntityRelationship(tribesman, entity);
      if (relationship === EntityRelationship.friendly || relationship === EntityRelationship.enemy) {
         continue;
      }

      // Don't try to gift items to tribesman who are already in an established tribe
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribe.getNumEntitiesOfType(EntityType.tribeTotem) >= 1) {
         continue;
      }
      
      const relations = tribesmanComponent.tribesmanRelations[entity] || 0;
      if (relations > maxRelations) {
         maxRelations = relationship;
         closestAcquaintance = entity;
      }
   }
   
   return closestAcquaintance;
}