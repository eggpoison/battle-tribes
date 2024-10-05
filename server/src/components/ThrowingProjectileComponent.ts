import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { InventoryComponentArray } from "./InventoryComponent";
import { entityExists } from "../world";

export class ThrowingProjectileComponent {
   readonly tribeMember: EntityID;
   readonly itemID: number | null;

   constructor(tribeMember: EntityID, itemID: number | null) {
      this.tribeMember = tribeMember;
      this.itemID = itemID;
   }
}

export const ThrowingProjectileComponentArray = new ComponentArray<ThrowingProjectileComponent>(ServerComponentType.throwingProjectile, true, {
   onJoin: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onRemove(entity: EntityID): void {
   const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(entity);
   if (!entityExists(throwingProjectileComponent.tribeMember) || throwingProjectileComponent.itemID === null) {
      return;
   }

   const ownerInventoryComponent = InventoryComponentArray.getComponent(throwingProjectileComponent.tribeMember);
   
   const idx = ownerInventoryComponent.absentItemIDs.indexOf(throwingProjectileComponent.itemID);
   if (idx !== -1) {
      ownerInventoryComponent.absentItemIDs.splice(idx, 1);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}