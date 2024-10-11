import { BlockBox, BoxFromType, BoxType, DamageBox, GenericCollisionBoxInfo } from "battletribes-shared/boxes/boxes";
import { InventoryName } from "battletribes-shared/items/items";

class GenericCollisionBox<T extends BoxType> implements GenericCollisionBoxInfo<T> {
   public box: BoxFromType[T];
   public readonly associatedLimbInventoryName: InventoryName;
   public collidingBox: ClientDamageBox | ClientBlockBox | null = null;
   public isActive: boolean;
   
   constructor(box: BoxFromType[T], associatedLimbInventoryName: InventoryName, isActive: boolean) {
      this.box = box;
      this.associatedLimbInventoryName = associatedLimbInventoryName;
      this.isActive = isActive;
   }
}

export class ClientDamageBox<T extends BoxType = BoxType> extends GenericCollisionBox<T> implements DamageBox<T> {}
export class ClientBlockBox<T extends BoxType = BoxType> extends GenericCollisionBox<T> implements BlockBox<T> {
   public hasBlocked = false;
}