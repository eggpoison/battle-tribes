import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/TransformComponent";

class ResearchBench extends Entity {
   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/research-bench/research-bench.png")
         )
      );
   }

   public onLoad(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      if (transformComponent.ageTicks <= 0) {
         playSound("wooden-wall-place.mp3", 0.3, 1, transformComponent.position);
      }
   }
}

export default ResearchBench;