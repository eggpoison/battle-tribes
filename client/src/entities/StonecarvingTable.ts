import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class StonecarvingTable extends Entity {
   constructor(id: number) {
      super(id, EntityType.stonecarvingTable);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            1,
            0,
            getTextureArrayIndex("entities/stonecarving-table/stonecarving-table.png")
         )
      );
   }
}

export default StonecarvingTable;