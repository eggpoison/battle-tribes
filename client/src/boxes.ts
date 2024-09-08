import { BoxFromType, BoxType, DamageBoxWrapper } from "webgl-test-shared/dist/boxes/boxes";
import { DamageBoxType } from "webgl-test-shared/dist/components";

export interface ClientDamageBoxWrapper<T extends BoxType = BoxType> extends DamageBoxWrapper<T> {
   collidingDamageBox: ClientDamageBoxWrapper | null;
   readonly type: DamageBoxType;
}

export function createDamageBox<T extends BoxType>(box: BoxFromType[T], type: DamageBoxType): ClientDamageBoxWrapper<T> {
   return {
      box: box,
      collidingDamageBox: null,
      type: type
   };
}