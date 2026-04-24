import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface LootComponentData {}

export interface LootComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.loot, _LootComponentArray> {}
}

class _LootComponentArray extends _ServerComponentArray<LootComponent, LootComponentData> {
   public decodeData(): LootComponentData {
      return {};
   }

   public createComponent(): LootComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const LootComponentArray = registerServerComponentArray(ServerComponentType.loot, _LootComponentArray, true);