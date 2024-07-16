import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class FenceGate extends Entity {
   constructor(id: number) {
      super(id, EntityType.fenceGate);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            1,
            0,
            getTextureArrayIndex("entities/fence-gate/fence-gate-sides.png")
         )
      );

      const doorRenderPart = new TexturedRenderPart(
         this,
         0,
         0,
         getTextureArrayIndex("entities/fence-gate/fence-gate-door.png")
      );
      this.attachRenderPart(doorRenderPart);
   }
}

export default FenceGate;