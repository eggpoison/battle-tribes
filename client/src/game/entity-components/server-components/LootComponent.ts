import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface LootComponentData {}

export interface LootComponent {}

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