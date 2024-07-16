import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class Frostshaper extends Entity {
   constructor(id: number) {
      super(id, EntityType.frostshaper);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/frostshaper/frostshaper.png"),
            1,
            0
         )
      );
   }
}

export default Frostshaper;