import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface CraftingStationComponentData {}

export interface CraftingStationComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.craftingStation, _CraftingStationComponentArray> {}
}

class _CraftingStationComponentArray extends _ServerComponentArray<CraftingStationComponent, CraftingStationComponentData> {
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