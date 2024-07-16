import { ServerComponentType, ThrowingProjectileComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { InventoryComponentArray } from "./InventoryComponent";
import Board from "../Board";

export interface ThrowingProjectileComponentParams {
   tribeMemberID: number;
   itemID: number | null;
}

export class ThrowingProjectileComponent {
   readonly tribeMemberID: number;
   readonly itemID: number | null;

   constructor(params: ThrowingProjectileComponentParams) {
      this.tribeMemberID = params.tribeMemberID;
      this.itemID = params.itemID;
   }
}

export const ThrowingProjectileComponentArray = new ComponentArray<ThrowingProjectileComponent>(ServerComponentType.throwingProjectile, true, {
   onJoin: onRemove,
   serialise: serialise
});

function onRemove(entity: EntityID): void {
   const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(entity);
   if (!Board.hasEntity(throwingProjectileComponent.tribeMemberID) || throwingProjectileComponent.itemID === null) {
      return;
   }

   const ownerInventoryComponent = InventoryComponentArray.getComponent(throwingProjectileComponent.tribeMemberID);
   
   const idx = ownerInventoryComponent.absentItemIDs.indexOf(throwingProjectileComponent.itemID);
   if (idx !== -1) {
      ownerInventoryComponent.absentItemIDs.splice(idx, 1);
   }
}

function serialise(): ThrowingProjectileComponentData {
   return {
      componentType: ServerComponentType.throwingProjectile
   };
}