import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "../Entity";
import { playSound } from "../sound";

class ResearchBench extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.researchBench, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/research-bench/research-bench.png"),
            0,
            0
         )
      );

      // @Cleanup: why <= 1?
      if (this.ageTicks <= 1) {
         playSound("wooden-wall-place.mp3", 0.3, 1, this.position.x, this.position.y);
      }
   }
}

export default ResearchBench;