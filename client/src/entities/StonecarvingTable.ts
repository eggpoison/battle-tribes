import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class StonecarvingTable extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.stonecarvingTable, ageTicks);

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