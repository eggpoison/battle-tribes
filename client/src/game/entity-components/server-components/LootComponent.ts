import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface LootComponentData {}

export interface LootComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.loot, typeof LootComponentArray> {}
}

export const LootComponentArray = registerServerComponentArray(
   ServerComponentType.loot,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): LootComponentData {
   return {};
}

function createComponent(): LootComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}