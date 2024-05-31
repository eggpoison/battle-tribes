import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "../Entity";

class ResearchBench extends Entity {
   private static readonly WIDTH = 32 * 4;
   private static readonly HEIGHT = 20 * 4;

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
   }
}

export default ResearchBench;