import { ScarInfo } from "battletribes-shared/components";
import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class TribeWarriorComponent extends ServerComponent {
   public readonly scars = new Array<ScarInfo>();

   public padData(reader: PacketReader): void {
      const numScars = reader.readNumber();
      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numScars);
   }
   
   public updateFromData(reader: PacketReader): void {
      const numScars = reader.readNumber();
      for (let i = this.scars.length; i < numScars; i++) {
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const type = reader.readNumber();

         this.scars.push({
            offsetX: offsetX,
            offsetY: offsetY,
            rotation: rotation,
            type: type
         });
      }
   }
}

export default TribeWarriorComponent;

export const TribeWarriorComponentArray = new ComponentArray<TribeWarriorComponent>(ComponentArrayType.server, ServerComponentType.tribeWarrior, true, {});