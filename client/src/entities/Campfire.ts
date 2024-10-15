import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";

class Campfire extends Entity {
   public static readonly SIZE = 104;

   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/campfire/campfire.png")
         )
      );
   }
}

export default Campfire;