import ServerComponent from "../ServerComponent";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";

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
   public renderPart!: TexturedRenderPart;
}

export default BerryBushComponent;

export const BerryBushComponentArray = new ServerComponentArray<BerryBushComponent>(ServerComponentType.berryBush, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID, isInitialData: boolean): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(entity);
   
   const numBerries = reader.readNumber();

   if (isInitialData) {
      berryBushComponent.renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(BERRY_BUSH_TEXTURE_SOURCES[numBerries])
      );
      berryBushComponent.renderPart.addTag("berryBushComponent:renderPart");
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.attachRenderThing(berryBushComponent.renderPart);
   } else if (numBerries !== berryBushComponent.numBerries) {
      berryBushComponent.numBerries = numBerries;

      berryBushComponent.renderPart.switchTextureSource(BERRY_BUSH_TEXTURE_SOURCES[berryBushComponent.numBerries]);
      // @Bug: not working!
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.dirty();
   }
}