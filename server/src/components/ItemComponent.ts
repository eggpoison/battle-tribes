import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { removeFleshSword } from "../flesh-sword-ai";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface ItemComponentParams {
   itemType: ItemType;
   amount: number;
   throwingEntity: EntityID | null;
}

export class ItemComponent {
   readonly itemType: ItemType;
   amount: number;
   
   /** Stores which entities are on cooldown to pick up the item, and their remaining cooldowns */
   readonly entityPickupCooldowns: Partial<Record<number, number>> = {};

   public readonly throwingEntity: EntityID | null;

   constructor(params: ItemComponentParams) {
      this.itemType = params.itemType;
      this.amount = params.amount;
      this.throwingEntity = params.throwingEntity;

      if (params.throwingEntity !== null) {
         // Add a pickup cooldown so the item isn't picked up immediately
         this.entityPickupCooldowns[params.throwingEntity] = 1;
      }
   }
}

export const ItemComponentArray = new ComponentArray<ItemComponent>(ServerComponentType.item, true, {
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onRemove(entity: EntityID): void {
   // Remove flesh sword item entities
   const itemComponent = ItemComponentArray.getComponent(entity);
   if (itemComponent.itemType === ItemType.flesh_sword) {
      removeFleshSword(entity);
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

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const itemComponent = ItemComponentArray.getComponent(entity);
   packet.addNumber(itemComponent.itemType);
}