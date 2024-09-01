import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class ResearchBench extends Entity {
   constructor(id: number) {
      super(id, EntityType.researchBench);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/research-bench/research-bench.png")
         )
      );
   }

   public onLoad(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      if (transformComponent.ageTicks <= 0) {
         playSound("wooden-wall-place.mp3", 0.3, 1, transformComponent.position);
      }
   }
}

export default ResearchBench;