import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface AutoSpawnedComponentData {}

export interface AutoSpawnedComponent {}

export const AutoSpawnedComponentArray = new ServerComponentArray<AutoSpawnedComponent, AutoSpawnedComponentData>(ServerComponentType.autoSpawned, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): AutoSpawnedComponentData {
   return {};
}

function createComponent(): AutoSpawnedComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}