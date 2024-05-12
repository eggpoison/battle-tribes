import { ItemComponentData } from "webgl-test-shared/dist/components";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import Entity from "../Entity";
import { ItemComponentArray } from "./ComponentArray";

export class ItemComponent {
   readonly itemType: ItemType;
   amount: number;
   
   /** Stores which entities are on cooldown to pick up the item, and their remaining cooldowns */
   readonly entityPickupCooldowns: Partial<Record<number, number>> = {};

   /** The ID of the entity which threw the item. 0 if was not thrown by an entity */
   public readonly throwingEntityID: number;

   constructor(itemType: ItemType, amount: number, throwingEntityID: number) {
      this.itemType = itemType;
      this.amount = amount;
      this.throwingEntityID = throwingEntityID;
   }
}

export function tickItemComponent(itemComponent: ItemComponent): void {
   // @Speed
   for (const entityID of Object.keys(itemComponent.entityPickupCooldowns).map(idString => Number(idString))) {
      itemComponent.entityPickupCooldowns[entityID] -= Settings.I_TPS;
      if (itemComponent.entityPickupCooldowns[entityID] <= 0) {
         delete itemComponent.entityPickupCooldowns[entityID];
      }
   }
}

export function serialiseItemComponent(entity: Entity): ItemComponentData {
   const itemComponent = ItemComponentArray.getComponent(entity.id);
   return {
      itemType: itemComponent.itemType
   };
}