import { ServerComponentType, Settings, Item, Entity, Packet } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { destroyEntity, getEntityAgeTicks } from "../world.js";

const enum Vars {
   TICKS_TO_DESPAWN = 300 * Settings.TICK_RATE,
   THROWING_ENTITY_PICKUP_COOLDOWN_TICKS = Settings.TICK_RATE
}

export class ItemComponent {
   public readonly item: Item;
   
   public throwingEntity: Entity | null;
   /** Number of ticks after throwing for which the throwing entity cannot pick up the item */
   public throwingEntityPickupCooldownTicks: number;

   constructor(item: Item, throwingEntity: Entity | null) {
      this.item = item;
      this.throwingEntity = throwingEntity;
      this.throwingEntityPickupCooldownTicks = Vars.THROWING_ENTITY_PICKUP_COOLDOWN_TICKS;
   }
}

export const ItemComponentArray = new ComponentArray<ItemComponent>(ServerComponentType.item, true, getDataLength, addDataToPacket);
ItemComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(itemEntity: Entity): void {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   if (itemComponent.throwingEntityPickupCooldownTicks > 0) {
      itemComponent.throwingEntityPickupCooldownTicks--;
   }

   // @HACK: this is shit for gameplay. disallows storerooms and stuff. instead probably make items decompose if left in poor conditions.
   if (getEntityAgeTicks(itemEntity) >= Vars.TICKS_TO_DESPAWN) {
      destroyEntity(itemEntity);
   }
}

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const itemComponent = ItemComponentArray.getComponent(entity);
   packet.writeNumber(itemComponent.item.type);
}

export function itemEntityCanBePickedUp(itemEntity: Entity, entity: Entity): boolean {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   return entity !== itemComponent.throwingEntity || itemComponent.throwingEntityPickupCooldownTicks === 0;
}