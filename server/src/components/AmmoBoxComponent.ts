import { AMMO_INFO_RECORD, ServerComponentType, TURRET_AMMO_TYPES, TurretAmmoType, TurretEntityType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { Packet } from "battletribes-shared/packets";
import { Entity } from "../../../shared/src/entities";
import { consumeItemTypeFromInventory, getFirstOccupiedItemSlotInInventory, getInventory, InventoryComponentArray } from "./InventoryComponent";
import { getEntityType } from "../world";

export class AmmoBoxComponent {
   public ammoType: TurretAmmoType = ItemType.wood;
   public ammoRemaining = 0;
}

export const AmmoBoxComponentArray = new ComponentArray<AmmoBoxComponent>(ServerComponentType.ammoBox, true, getDataLength, addDataToPacket);
AmmoBoxComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
}

const getAmmoType = (turret: Entity): TurretAmmoType | null => {
   const inventoryComponent = InventoryComponentArray.getComponent(turret);
   const ammoBoxInventory = getInventory(inventoryComponent, InventoryName.ammoBoxInventory);

   const firstOccupiedSlot = getFirstOccupiedItemSlotInInventory(ammoBoxInventory);
   if (firstOccupiedSlot === 0) {
      return null;
   }

   const entityType = getEntityType(turret) as TurretEntityType;
   
   const item = ammoBoxInventory.itemSlots[firstOccupiedSlot]!;
   if (!TURRET_AMMO_TYPES[entityType].includes(item.type as TurretAmmoType)) {
      console.warn("Item type in ammo box isn't ammo");
      return null;
   }

   return item.type as TurretAmmoType;
}

const attemptAmmoLoad = (entity: Entity, ammoBoxComponent: AmmoBoxComponent): void => {
   const ammoType = getAmmoType(entity);
   if (ammoType !== null) {
      // Load the ammo
      ammoBoxComponent.ammoType = ammoType;
      ammoBoxComponent.ammoRemaining = AMMO_INFO_RECORD[ammoType].ammoMultiplier;

      const inventoryComponent = InventoryComponentArray.getComponent(entity);
      consumeItemTypeFromInventory(entity, inventoryComponent, InventoryName.ammoBoxInventory, ammoType, 1);
   }
}

function onTick(entity: Entity): void {
   const ammoBoxComponent = AmmoBoxComponentArray.getComponent(entity);

   // Attempt to load ammo if there is none loaded
   // @Speed: ideally shouldn't be done every tick, just when the inventory is changed (ammo is added to the inventory)
   if (ammoBoxComponent.ammoRemaining === 0) {
      attemptAmmoLoad(entity, ammoBoxComponent);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entityID: number): void {
   const ballistaComponent = AmmoBoxComponentArray.getComponent(entityID);

   packet.writeNumber(ballistaComponent.ammoType);
   packet.writeNumber(ballistaComponent.ammoRemaining);
}