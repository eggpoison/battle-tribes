import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { randFloat } from "webgl-test-shared/dist/utils";
import { FishColour } from "webgl-test-shared/dist/entities";
import { PacketReader } from "webgl-test-shared/dist/packets";

class FishComponent extends ServerComponent {
   public readonly colour: FishColour;
   public readonly waterOpacityMultiplier: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.colour = reader.readNumber();
      this.waterOpacityMultiplier = randFloat(0.6, 1);
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default FishComponent;