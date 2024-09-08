import { BoxFromType, BoxType, DamageBoxWrapper, HitboxWrapper } from "webgl-test-shared/dist/boxes/boxes";
import { LimbInfo } from "./components/InventoryUseComponent";
import { EntityID } from "webgl-test-shared/dist/entities";
import { InventoryName } from "webgl-test-shared/dist/items/items";
import { DamageBoxType } from "webgl-test-shared/dist/components";

type CollisionCallback = (attacker: EntityID, victim: EntityID, limb: LimbInfo, collidingDamageBox: ServerDamageBoxWrapper | null) => void;

export interface DamageBoxCallbacks {
   readonly onCollisionEnter?: CollisionCallback;
   readonly onCollision?: CollisionCallback;
}

export interface ServerDamageBoxWrapper<T extends BoxType = BoxType> extends DamageBoxWrapper<T> {
   // Kinda hacky but whatever. It works (imagine there is a shrug in ascii here)
   readonly associatedLimbInventoryName: InventoryName;
   readonly onCollisionEnter?: CollisionCallback;
   readonly onCollision?: CollisionCallback;
   collidingDamageBox: ServerDamageBoxWrapper | null;
   /** If set to true, the wrapper will be destroyed. */
   isRemoved: boolean;
   isActive: boolean;
   // @Hack
   readonly isTemporary: boolean;
   readonly type: DamageBoxType;
}

export function createDamageBox<T extends BoxType>(box: BoxFromType[T], associatedLimbInventoryName: InventoryName, callbacks: DamageBoxCallbacks, isTemporary: boolean, type: DamageBoxType): ServerDamageBoxWrapper<T> {
   return {
      box: box,
      associatedLimbInventoryName: associatedLimbInventoryName,
      onCollisionEnter: callbacks.onCollisionEnter,
      onCollision: callbacks.onCollision,
      collidingDamageBox: null,
      isRemoved: false,
      isActive: true,
      isTemporary: isTemporary,
      type: type
   };
}

// @Cleanup: unused?
export function wrapperIsDamageBox(wrapper: ServerDamageBoxWrapper | HitboxWrapper): wrapper is ServerDamageBoxWrapper {
   return typeof (wrapper as HitboxWrapper).collisionType === "undefined";
}