import { EntityID, EntityType } from "battletribes-shared/entities";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class FibrePlant extends Entity {
   constructor(id: EntityID) {
      super(id);

      const renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex("entities/fibre-plant/fibre-plant.png")
      );
      this.attachRenderThing(renderPart);
   }
}

export default FibrePlant;