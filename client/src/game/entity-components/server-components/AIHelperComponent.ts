import { ServerComponentType } from "../../../../../shared/src/components";
import { Bytes } from "../../../../../shared/src/constants";
import { PacketReader } from "../../../../../shared/src/packets";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AIHelperComponentData {}

export interface AIHelperComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.aiHelper, typeof AIHelperComponentArray> {}
}

export const AIHelperComponentArray = registerServerComponentArray(
   ServerComponentType.aiHelper,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(reader: PacketReader): AIHelperComponentData {
   reader.padOffset(Bytes.Float32);
   return {};
}

function createComponent(): AIHelperComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

export function createAIHelperComponentData(): AIHelperComponentData {
   return {};
}