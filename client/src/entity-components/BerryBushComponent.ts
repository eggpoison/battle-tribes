import { BerryBushComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";

export const BERRY_BUSH_TEXTURE_SOURCES = [
   "entities/berry-bush1.png",
   "entities/berry-bush2.png",
   "entities/berry-bush3.png",
   "entities/berry-bush4.png",
   "entities/berry-bush5.png",
   "entities/berry-bush6.png"
];

class BerryBushComponent extends ServerComponent<ServerComponentType.berryBush> {
   private renderPart: RenderPart;
   
   constructor(entity: Entity, data: BerryBushComponentData) {
      super(entity);
      
      this.renderPart = this.entity.getRenderPart("berryBushComponent:renderPart");
      this.updateFromData(data);
   }

   public updateFromData(data: BerryBushComponentData): void {
      const numBerries = data.numBerries;
      this.renderPart.switchTextureSource(BERRY_BUSH_TEXTURE_SOURCES[numBerries]);
   }
}

export default BerryBushComponent