import { BlockBox, BoxFromType, BoxType, DamageBox, GenericCollisionBoxInfo, Hitbox, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { InventoryName } from "battletribes-shared/items/items";
import { HitboxCollisionBit } from "../../shared/src/collision";
import Board from "./Board";

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

export class ClientHitbox<T extends BoxType = BoxType> implements Hitbox<T> {
   public readonly box: BoxFromType[T];

   public mass: number;
   public collisionType: HitboxCollisionType;
   public readonly collisionBit: HitboxCollisionBit;
   public readonly collisionMask: number;
   public readonly flags: ReadonlyArray<HitboxFlag>;

   public lastUpdateTicks = Board.serverTicks;

   constructor(box: BoxFromType[T], mass: number, collisionType: HitboxCollisionType, collisionBit: HitboxCollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>) {
      this.box = box;
      this.mass = mass;
      this.collisionType = collisionType;
      this.collisionBit = collisionBit;
      this.collisionMask = collisionMask;
      this.flags = flags;
   }
}