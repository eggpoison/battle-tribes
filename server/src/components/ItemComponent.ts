import { ItemComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { removeFleshSword } from "../flesh-sword-ai";
import { ItemType } from "webgl-test-shared/dist/items/items";

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

export const ItemComponentArray = new ComponentArray<ServerComponentType.item, ItemComponent>(true, {
   onRemove: onRemove,
   serialise: serialise
});

function onRemove(entityID: number): void {
   // Remove flesh sword item entities
   const itemComponent = ItemComponentArray.getComponent(entityID);
   if (itemComponent.itemType === ItemType.flesh_sword) {
      removeFleshSword(entityID);
   }
}

export function tickItemComponent(itemComponent: ItemComponent): void {
   // @Speed
   for (const entityID of Object.keys(itemComponent.entityPickupCooldowns).map(idString => Number(idString))) {
      itemComponent.entityPickupCooldowns[entityID]! -= Settings.I_TPS;
      if (itemComponent.entityPickupCooldowns[entityID]! <= 0) {
         delete itemComponent.entityPickupCooldowns[entityID];
      }
   }
}

function serialise(entityID: number): ItemComponentData {
   const itemComponent = ItemComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.item,
      itemType: itemComponent.itemType
   };
}