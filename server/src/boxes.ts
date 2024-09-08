import { BoxFromType, BoxType, DamageBoxWrapper, HitboxWrapper } from "webgl-test-shared/dist/boxes/boxes";
import { LimbInfo } from "./components/InventoryUseComponent";
import { EntityID } from "webgl-test-shared/dist/entities";
import { InventoryName } from "webgl-test-shared/dist/items/items";

type CollisionCallback = (attacker: EntityID, victim: EntityID, limb: LimbInfo, collidingDamageBox: ServerDamageBoxWrapper | null) => void;

export interface ServerDamageBoxWrapper<T extends BoxType = BoxType> extends DamageBoxWrapper<T> {
   // Kinda hacky but whatever. It works (imagine there is a shrug in ascii here)
   readonly associatedLimbInventoryName: InventoryName;
   readonly collisionCallback: CollisionCallback;
   /** If set to true, the wrapper will be destroyed. */
   isRemoved: boolean;
   isActive: boolean;
   // @Hack
   readonly isTemporary: boolean;
}

export function createDamageBox<T extends BoxType>(box: BoxFromType[T], associatedLimbInventoryName: InventoryName, collisionCallback: CollisionCallback, isTemporary: boolean): ServerDamageBoxWrapper<T> {
   return {
      box: box,
      associatedLimbInventoryName: associatedLimbInventoryName,
      collisionCallback: collisionCallback,
      isRemoved: false,
      isActive: true,
      isTemporary: isTemporary
   };
}

// @Cleanup: unused?
export function wrapperIsDamageBox(wrapper: ServerDamageBoxWrapper | HitboxWrapper): wrapper is ServerDamageBoxWrapper {
   return typeof (wrapper as HitboxWrapper).collisionType === "undefined";
}