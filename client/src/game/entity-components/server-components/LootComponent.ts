import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface LootComponentData {}

export interface LootComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.loot, _LootComponentArray> {}
}

class _LootComponentArray extends ServerComponentArray<LootComponent, LootComponentData> {
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