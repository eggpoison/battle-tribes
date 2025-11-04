import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface LootComponentData {}

export interface LootComponent {}

export const LootComponentArray = new ServerComponentArray<LootComponent, LootComponentData, never>(ServerComponentType.loot, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): LootComponentData {
   return {};
}

function createComponent(): LootComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}