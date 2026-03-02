import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { InventoryComponentArray } from "./InventoryComponent";
import { entityExists } from "../world";

export class ThrowingProjectileComponent {
   readonly tribeMember: Entity;
   readonly itemID: number | null;

   constructor(tribeMember: Entity, itemID: number | null) {
      this.tribeMember = tribeMember;
      this.itemID = itemID;
   }
}

export const ThrowingProjectileComponentArray = new ComponentArray<ThrowingProjectileComponent>(ServerComponentType.throwingProjectile, true, getDataLength, addDataToPacket);
ThrowingProjectileComponentArray.onRemove = onRemove;

function onRemove(entity: Entity): void {
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
   return 0;
}

function addDataToPacket(): void {}