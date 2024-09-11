import { BlockBox, BoxFromType, BoxType, DamageBox, GenericCollisionBoxInfo } from "webgl-test-shared/dist/boxes/boxes";
import { InventoryName } from "webgl-test-shared/dist/items/items";

class GenericCollisionBox<T extends BoxType> implements GenericCollisionBoxInfo<T> {
   public box: BoxFromType[T];
   public readonly associatedLimbInventoryName: InventoryName;
   public collidingBox: ClientDamageBox | ClientBlockBox | null = null;
   
   constructor(box: BoxFromType[T], associatedLimbInventoryName: InventoryName) {
      this.box = box;
      this.associatedLimbInventoryName = associatedLimbInventoryName;
   }
}

export class ClientDamageBox<T extends BoxType = BoxType> extends GenericCollisionBox<T> implements DamageBox<T> {}
export class ClientBlockBox<T extends BoxType = BoxType> extends GenericCollisionBox<T> implements BlockBox<T> {}