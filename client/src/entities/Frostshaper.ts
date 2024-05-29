import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class Frostshaper extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.frostshaper, ageTicks);

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