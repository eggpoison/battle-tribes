import { ServerComponentType, PacketReader } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AIHelperComponentData {}

export interface AIHelperComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.aiHelper, _AIHelperComponentArray, AIHelperComponentData> {}
}

class _AIHelperComponentArray extends _ServerComponentArray<AIHelperComponent, AIHelperComponentData> {
   public decodeData(reader: PacketReader): AIHelperComponentData {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      return {};
   }

   public createComponent(): AIHelperComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const AIHelperComponentArray = registerServerComponentArray(ServerComponentType.aiHelper, _AIHelperComponentArray, true);

export function createAIHelperComponentData(): AIHelperComponentData {
   return {};
}