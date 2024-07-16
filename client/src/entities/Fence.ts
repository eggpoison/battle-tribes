import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class Fence extends Entity {
   constructor(id: number) {
      super(id, EntityType.fence);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/fence/fence-node.png"),
            1,
            0
         )
      );
   }
}

export default Fence;