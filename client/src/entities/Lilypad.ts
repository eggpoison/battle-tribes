import { EntityID, EntityType } from "battletribes-shared/entities";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../world";

class Lilypad extends Entity {
   constructor(entityID: EntityID) {
      super(entityID);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/lilypad/lilypad.png")
         )
      );
   }
}

export default Lilypad;