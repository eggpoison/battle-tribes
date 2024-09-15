import { BlockBox, BlockType, BoxFromType, BoxType, DamageBox, GenericCollisionBoxInfo, GenericCollisionBoxType } from "battletribes-shared/boxes/boxes";
import { LimbInfo } from "./components/InventoryUseComponent";
import { EntityID } from "battletribes-shared/entities";
import { InventoryName } from "battletribes-shared/items/items";

type CollisionCallback = (attacker: EntityID, victim: EntityID, limb: LimbInfo, collidingDamageBox: ServerDamageBox | null) => void;

export interface DamageBoxCallbacks {
   readonly onCollisionEnter?: CollisionCallback;
   readonly onCollision?: CollisionCallback;
}

class GenericCollisionBox<T extends BoxType> implements GenericCollisionBoxInfo<T> {
   public box: BoxFromType[T];
   public readonly associatedLimbInventoryName: InventoryName;
   public isActive: boolean;
   public collidingBox: ServerDamageBox | ServerBlockBox | null = null;
   
   constructor(box: BoxFromType[T], associatedLimbInventoryName: InventoryName, isActive: boolean) {
      this.box = box;
      this.associatedLimbInventoryName = associatedLimbInventoryName;
      this.isActive = isActive;
   }
}

export class ServerDamageBox<T extends BoxType = BoxType> extends GenericCollisionBox<T> implements DamageBox<T> {
   public isBlocked = false;
}
export class ServerBlockBox<T extends BoxType = BoxType> extends GenericCollisionBox<T> implements BlockBox<T> {
   public hasBlocked = false;
   public blockType = BlockType.partial;
}

export function getCollisionBoxType(collisionBox: ServerDamageBox | ServerBlockBox): GenericCollisionBoxType {
   if (collisionBox instanceof ServerDamageBox) {
      return GenericCollisionBoxType.damage;
   }
   return GenericCollisionBoxType.block;
}