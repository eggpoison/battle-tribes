import { BallistaAmmoType, ItemType } from "webgl-test-shared/dist/items";
import { AmmoBoxComponentArray } from "./ComponentArray";
import Entity from "../Entity";

export class AmmoBoxComponent {
   public ammoType: BallistaAmmoType = ItemType.wood;
   public ammoRemaining = 0;
}

export function serialiseAmmoBoxComponent(ballista: Entity): AmmoBoxComponent {
   const ballistaComponent = AmmoBoxComponentArray.getComponent(ballista.id);
   return {
      ammoType: ballistaComponent.ammoType,
      ammoRemaining: ballistaComponent.ammoRemaining
   };
}