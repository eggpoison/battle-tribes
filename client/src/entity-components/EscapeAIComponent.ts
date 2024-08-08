import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class EscapeAIComponent extends ServerComponent {
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      const numAttackingEntities = reader.readNumber();
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
   }

   public padData(reader: PacketReader): void {
      const numAttackingEntities = reader.readNumber();
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
   }
   
   public updateFromData(reader: PacketReader): void {
      const numAttackingEntities = reader.readNumber();
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
   }
}

export default EscapeAIComponent;

export const EscapeAIComponentArray = new ComponentArray<EscapeAIComponent>(ComponentArrayType.server, ServerComponentType.escapeAI, {});