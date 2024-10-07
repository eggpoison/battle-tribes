import { EntityType } from "battletribes-shared/entities";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class StonecarvingTable extends Entity {
   constructor(id: number) {
      super(id);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            1,
            0,
            getTextureArrayIndex("entities/stonecarving-table/stonecarving-table.png")
         )
      );
   }
}

export default StonecarvingTable;