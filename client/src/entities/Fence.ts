import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Fence extends Entity {
   constructor(id: number) {
      super(id, EntityType.fence);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            1,
            0,
            getTextureArrayIndex("entities/fence/fence-node.png")
         )
      );
   }
}

export default Fence;