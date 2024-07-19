import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "webgl-test-shared/dist/packets";

export const BERRY_BUSH_TEXTURE_SOURCES = [
   "entities/berry-bush1.png",
   "entities/berry-bush2.png",
   "entities/berry-bush3.png",
   "entities/berry-bush4.png",
   "entities/berry-bush5.png",
   "entities/berry-bush6.png"
];

class BerryBushComponent extends ServerComponent {
   public numBerries: number;
   private renderPart!: TexturedRenderPart;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);
      
      this.numBerries = reader.readNumber();
   }

   public onLoad(): void {
      this.renderPart = this.entity.getRenderPart("berryBushComponent:renderPart") as TexturedRenderPart;
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.numBerries = reader.readNumber();
      this.renderPart.switchTextureSource(BERRY_BUSH_TEXTURE_SOURCES[this.numBerries]);
   }
}

export default BerryBushComponent