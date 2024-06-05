import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class HealingTotem extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.healingTotem, ageTicks);

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