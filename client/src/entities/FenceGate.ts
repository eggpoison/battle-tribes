import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class FenceGate extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.fenceGate, ageTicks);

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