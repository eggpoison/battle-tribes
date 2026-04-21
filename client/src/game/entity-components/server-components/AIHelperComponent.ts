import { ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface AIHelperComponentData {}

export interface AIHelperComponent {}

class _AIHelperComponentArray extends ServerComponentArray<AIHelperComponent, AIHelperComponentData> {
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