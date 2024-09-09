import { BoxFromType, BoxType, DamageBoxWrapper } from "webgl-test-shared/dist/boxes/boxes";
import { DamageBoxType } from "webgl-test-shared/dist/components";
import { InventoryName } from "webgl-test-shared/dist/items/items";

export interface ClientDamageBoxWrapper<T extends BoxType = BoxType> extends DamageBoxWrapper<T> {
   readonly associatedLimbInventoryName: InventoryName;
   collidingDamageBox: ClientDamageBoxWrapper | null;
   readonly type: DamageBoxType;
}

export function createDamageBox<T extends BoxType>(box: BoxFromType[T], associatedLimbInventoryName: InventoryName, type: DamageBoxType): ClientDamageBoxWrapper<T> {
   return {
      box: box,
      associatedLimbInventoryName: associatedLimbInventoryName,
      collidingDamageBox: null,
      type: type
   };
}