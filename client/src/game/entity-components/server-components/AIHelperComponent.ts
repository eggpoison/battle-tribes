import { PacketReader } from "webgl-test-shared/src/packets";
import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface AIHelperComponentData {}

export interface AIHelperComponent {}

export const AIHelperComponentArray = new ServerComponentArray<AIHelperComponent, AIHelperComponentData, never>(ServerComponentType.aiHelper, true, createComponent, getMaxRenderParts, decodeData);

export function createAIHelperComponentData(): AIHelperComponentData {
   return {};
}

function decodeData(reader: PacketReader): AIHelperComponentData {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   return {};
}

function createComponent(): AIHelperComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}