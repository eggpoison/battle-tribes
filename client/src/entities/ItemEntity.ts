import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import Entity, { ComponentDataRecord } from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class ItemEntity extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) {
      super(position, id, EntityType.itemEntity, ageTicks);
      
      const itemComponentData = componentDataRecord[ServerComponentType.item]!;
      
      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponentData.itemType].entityTextureSource),
            0,
            0
         )
      );
   }
}

export default ItemEntity;