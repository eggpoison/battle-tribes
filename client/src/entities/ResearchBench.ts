import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";

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
}

export default ResearchBench;