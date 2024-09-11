import { EntityType } from "battletribes-shared/entities";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Fence extends Entity {
   constructor(id: number) {
      super(id, EntityType.fence);

      this.attachRenderThing(
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