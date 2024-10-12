import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";

class Fence extends Entity {
   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            1,
            0,
            getTextureArrayIndex("entities/fence/fence-node.png")
         )
      );
   }
}

export default Fence;