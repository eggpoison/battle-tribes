import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface CraftingStationComponentData {}

export interface CraftingStationComponent {}

class _CraftingStationComponentArray extends ServerComponentArray<CraftingStationComponent> {
   public decodeData(): CraftingStationComponentData {
      return {};
   }

   public createComponent(): CraftingStationComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const CraftingStationComponentArray = registerServerComponentArray(ServerComponentType.craftingStation, _CraftingStationComponentArray, true);

export function createCraftingStationComponentData(): CraftingStationComponentData {
   return {};
}