import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class HealingTotem extends Entity {
   constructor(id: number) {
      super(id, EntityType.healingTotem);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/healing-totem/healing-totem.png"),
            0,
            0
         )
      );
   }
}

export default HealingTotem;