import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class StonecarvingTable extends Entity {
   constructor(id: number) {
      super(id, EntityType.stonecarvingTable);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/stonecarving-table/stonecarving-table.png"),
            1,
            0
         )
      );
   }
}

export default StonecarvingTable;