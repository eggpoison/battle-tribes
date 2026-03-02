import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, LimbAction } from "battletribes-shared/entities";
import { InventoryUseComponentArray } from "../../../components/InventoryUseComponent";
import { TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { InventoryComponentArray, getInventory } from "../../../components/InventoryComponent";
import { Inventory, InventoryName, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, ConsumableItemInfo, ConsumableItemCategory } from "battletribes-shared/items/items";

export interface HealingItemUseInfo {
   readonly itemSlot: number;
   readonly inventory: Inventory;
}

export function getHealingItemUseInfo(tribesmanID: number): HealingItemUseInfo | null {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesmanID);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   for (let i = 0; i < hotbarInventory.items.length; i++) {
      const item = hotbarInventory.items[i];

      const itemCategory = ITEM_TYPE_RECORD[item.type];
      if (itemCategory === "healing") {
         return {
            itemSlot: hotbarInventory.getItemSlot(item),
            inventory: hotbarInventory
         };
      }
   }

   return null;
}

export function continueTribesmanHealing(tribesmanID: Entity, healingItemUseInfo: HealingItemUseInfo): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesmanID);
   const limbInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   limbInfo.selectedItemSlot = healingItemUseInfo.itemSlot;

   const foodItem = healingItemUseInfo.inventory.itemSlots[healingItemUseInfo.itemSlot];
   // @HACK
   if (typeof foodItem === "undefined") {
      console.warn("shite.")
      return;
   }
   const itemInfo = ITEM_INFO_RECORD[foodItem.type] as ConsumableItemInfo;

   let action: LimbAction;
   switch (itemInfo.consumableItemCategory) {
      case ConsumableItemCategory.food: {
         action = LimbAction.eat;
         break;
      }
      case ConsumableItemCategory.medicine: {
         action = LimbAction.useMedicine;
         break;
      }
   }
   
   // If the food is only just being eaten, reset the food timer so that the food isn't immediately eaten
   if (limbInfo.action !== action) {
      limbInfo.foodEatingTimer = itemInfo.consumeTime;
   }
   limbInfo.action = action;
   
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesmanID);
   tribesmanAIComponent.currentAIType = TribesmanAIType.eating;
   return;
}