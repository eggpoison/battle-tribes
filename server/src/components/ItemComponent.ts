import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { ComponentArray } from "./ComponentArray";
import { removeFleshSword } from "../flesh-sword-ai";
import { ItemType } from "battletribes-shared/items/items";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks } from "../world";

const enum Vars {
   TICKS_TO_DESPAWN = 300 * Settings.TPS
}

export interface ItemComponentParams {
   itemType: ItemType;
   amount: number;
   throwingEntity: EntityID | null;
}

export class ItemComponent {
   public readonly itemType: ItemType;
   public amount: number;
   
   /** Stores which entities are on cooldown to pick up the item, and their remaining cooldowns */
   readonly entityPickupCooldowns: Partial<Record<number, number>> = {};

   public throwingEntity: EntityID | null = null;

   constructor(itemType: ItemType, amount: number, throwingEntity: EntityID | null) {
      this.itemType = itemType;
      this.amount = amount;

      if (throwingEntity !== null) {
         // Add a pickup cooldown so the item isn't picked up immediately
         this.entityPickupCooldowns[throwingEntity] = 1;
      }
   }
}

export const ItemComponentArray = new ComponentArray<ItemComponent>(ServerComponentType.item, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
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

function onTick(itemComponent: ItemComponent, itemEntity: EntityID): void {
   // @Speed
   for (const entityID of Object.keys(itemComponent.entityPickupCooldowns).map(idString => Number(idString))) {
      itemComponent.entityPickupCooldowns[entityID]! -= Settings.I_TPS;
      if (itemComponent.entityPickupCooldowns[entityID]! <= 0) {
         delete itemComponent.entityPickupCooldowns[entityID];
      }
   }
   
   // Despawn old items
   const ageTicks = getEntityAgeTicks(itemEntity);
   if (ageTicks >= Vars.TICKS_TO_DESPAWN) {
      destroyEntity(itemEntity);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const itemComponent = ItemComponentArray.getComponent(entity);
   packet.addNumber(itemComponent.itemType);
}