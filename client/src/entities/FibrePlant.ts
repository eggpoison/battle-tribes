import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class FibrePlant extends Entity {
   constructor(id: EntityID) {
      super(id, EntityType.fibrePlant);

      const renderPart = new TexturedRenderPart(
         this,
         0,
         0,
         getTextureArrayIndex("entities/fibre-plant/fibre-plant.png")
      );
      this.attachRenderPart(renderPart);
   }
}

export default FibrePlant;