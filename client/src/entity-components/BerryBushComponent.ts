import ServerComponent from "./ServerComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

const BERRY_BUSH_TEXTURE_SOURCES = [
   "entities/berry-bush1.png",
   "entities/berry-bush2.png",
   "entities/berry-bush3.png",
   "entities/berry-bush4.png",
   "entities/berry-bush5.png",
   "entities/berry-bush6.png"
];

class BerryBushComponent extends ServerComponent {
   public numBerries = 0;
   private renderPart!: TexturedRenderPart;

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader, isInitialData: boolean): void {
      const numBerries = reader.readNumber();

      if (isInitialData) {
         this.renderPart = new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(BERRY_BUSH_TEXTURE_SOURCES[numBerries])
         );
         this.renderPart.addTag("berryBushComponent:renderPart");
         this.entity.attachRenderThing(this.renderPart);
      } else if (numBerries !== this.numBerries) {
         this.numBerries = numBerries;

         this.renderPart.switchTextureSource(BERRY_BUSH_TEXTURE_SOURCES[this.numBerries]);
         // @Bug: not working!
         this.entity.dirty();
      }
   }
}

export default BerryBushComponent;

export const BerryBushComponentArray = new ComponentArray<BerryBushComponent>(ComponentArrayType.server, ServerComponentType.berryBush, true, {});