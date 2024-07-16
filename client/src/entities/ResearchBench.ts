import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity, { ComponentDataRecord } from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class ResearchBench extends Entity {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.researchBench);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("entities/research-bench/research-bench.png")
         )
      );

      // @Cleanup: why <= 1?
      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("wooden-wall-place.mp3", 0.3, 1, Point.unpackage(transformComponentData.position));
      }
   }
}

export default ResearchBench;