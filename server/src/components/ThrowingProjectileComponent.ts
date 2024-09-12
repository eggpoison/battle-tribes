import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { InventoryComponentArray } from "./InventoryComponent";
import Board from "../Board";

export interface ThrowingProjectileComponentParams {
   tribeMember: EntityID;
   itemID: number | null;
}

export class ThrowingProjectileComponent implements ThrowingProjectileComponentParams {
   readonly tribeMember: EntityID;
   readonly itemID: number | null;

   constructor(params: ThrowingProjectileComponentParams) {
      this.tribeMember = params.tribeMember;
      this.itemID = params.itemID;
   }
}

export const ThrowingProjectileComponentArray = new ComponentArray<ThrowingProjectileComponent>(ServerComponentType.throwingProjectile, true, {
   onJoin: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onRemove(entity: EntityID): void {
   const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(entity);
   if (!Board.hasEntity(throwingProjectileComponent.tribeMember) || throwingProjectileComponent.itemID === null) {
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