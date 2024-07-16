import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class FenceGate extends Entity {
   constructor(id: number) {
      super(id, EntityType.fenceGate);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/fence-gate/fence-gate-sides.png"),
            1,
            0
         )
      );

      const doorRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/fence-gate/fence-gate-door.png"),
         0,
         0
      );
      this.attachRenderPart(doorRenderPart);
   }
}

export default FenceGate;