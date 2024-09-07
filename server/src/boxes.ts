import { BoxFromType, BoxType, DamageBoxWrapper } from "webgl-test-shared/dist/boxes/boxes";
import { LimbInfo } from "./components/InventoryUseComponent";

export interface ServerDamageBoxWrapper<T extends BoxType = BoxType> extends DamageBoxWrapper<T> {
   // Kinda hacky but whatever. It works (imagine there is a shrug in ascii here)
   readonly limbInfo: LimbInfo;
   isRemoved: boolean;
}

export function createDamageBox<T extends BoxType>(box: BoxFromType[T], limbInfo: LimbInfo): ServerDamageBoxWrapper<T> {
   return {
      box: box,
      limbInfo: limbInfo,
      isRemoved: false
   };
}