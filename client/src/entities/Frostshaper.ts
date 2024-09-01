import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Frostshaper extends Entity {
   constructor(id: number) {
      super(id, EntityType.frostshaper);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            1,
            0,
            getTextureArrayIndex("entities/frostshaper/frostshaper.png")
         )
      );
   }
}

export default Frostshaper;