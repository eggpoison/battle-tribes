import { ScarInfo } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class TribeWarriorComponent extends ServerComponent {
   public readonly scars: ReadonlyArray<ScarInfo>;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      const scars = new Array<ScarInfo>();
      const numScars = reader.readNumber();
      for (let i = 0; i < numScars; i++) {
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const type = reader.readNumber();

         scars.push({
            offsetX: offsetX,
            offsetY: offsetY,
            rotation: rotation,
            type: type
         });
      }
      this.scars = scars;
   }

   public padData(reader: PacketReader): void {
      const numScars = reader.readNumber();
      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numScars);
   }
   
   public updateFromData(reader: PacketReader): void {
      const numScars = reader.readNumber();
      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numScars);
   }
}

export default TribeWarriorComponent;

export const TribeWarriorComponentArray = new ComponentArray<TribeWarriorComponent>(ComponentArrayType.server, ServerComponentType.tribeWarrior, {});