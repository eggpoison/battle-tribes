import { ServerComponentType } from "../../../../../shared/src/components";
import { Bytes } from "../../../../../shared/src/constants";
import { PacketReader } from "../../../../../shared/src/packets";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AIHelperComponentData {}

export interface AIHelperComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.aiHelper, _AIHelperComponentArray> {}
}

class _AIHelperComponentArray extends ServerComponentArray<AIHelperComponent, AIHelperComponentData> {
   public decodeData(reader: PacketReader): AIHelperComponentData {
      reader.padOffset(Bytes.Float32);
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