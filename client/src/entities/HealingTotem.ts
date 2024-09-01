import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class HealingTotem extends Entity {
   constructor(id: number) {
      super(id, EntityType.healingTotem);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/healing-totem/healing-totem.png")
         )
      );
   }
}

export default HealingTotem;