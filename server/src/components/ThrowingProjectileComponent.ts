import { ServerComponentType, ThrowingProjectileComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { Item } from "webgl-test-shared/dist/items/items";

export class ThrowingProjectileComponent {
   readonly tribeMemberID: number;
   readonly item: Item;

   constructor(tribeMemberID: number, item: Item) {
      this.tribeMemberID = tribeMemberID;
      this.item = item;
   }
}

export const ThrowingProjectileComponentArray = new ComponentArray<ServerComponentType.throwingProjectile, ThrowingProjectileComponent>(true, {
   serialise: serialise
});

function serialise(): ThrowingProjectileComponentData {
   return {
      componentType: ServerComponentType.throwingProjectile
   };
}