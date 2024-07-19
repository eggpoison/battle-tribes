import { Point, randFloat } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import Entity from "../Entity";
import { Light, addLight, attachLightToEntity } from "../lights";
import { PacketReader } from "webgl-test-shared/dist/packets";

class CookingComponent extends ServerComponent {
   public heatingProgress: number;
   public isCooking: boolean;

   private readonly light: Light;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.heatingProgress = reader.readNumber();
      this.isCooking = reader.readBoolean();
      reader.padOffset(3);

      this.light = {
         offset: new Point(0, 0),
         intensity: 1,
         strength: 3.5,
         radius: 40,
         r: 0,
         g: 0,
         b: 0
      };
      const lightID = addLight(this.light);
      attachLightToEntity(lightID, this.entity.id);
   }

   public tick(): void {
      if (Board.tickIntervalHasPassed(0.15)) {
         this.light.radius = 40 + randFloat(-7, 7);
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      this.heatingProgress = reader.readNumber();
      this.isCooking = reader.readBoolean();
      reader.padOffset(3);
   }
}

export default CookingComponent;