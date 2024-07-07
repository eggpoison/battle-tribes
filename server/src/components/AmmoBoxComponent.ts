import { AmmoBoxComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { BallistaAmmoType, ItemType } from "webgl-test-shared/dist/items/items";

export interface AmmoBoxComponentParams {}

export class AmmoBoxComponent {
   public ammoType: BallistaAmmoType = ItemType.wood;
   public ammoRemaining = 0;
}

export const AmmoBoxComponentArray = new ComponentArray<ServerComponentType.ammoBox, AmmoBoxComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): AmmoBoxComponentData {
   const ballistaComponent = AmmoBoxComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.ammoBox,
      ammoType: ballistaComponent.ammoType,
      ammoRemaining: ballistaComponent.ammoRemaining
   };
}