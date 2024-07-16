import { EntityType } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import Entity, { ComponentDataRecord } from "../Entity";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class ItemEntity extends Entity {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.itemEntity);
      
      const itemComponentData = componentDataRecord[ServerComponentType.item]!;
      
      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponentData.itemType].entityTextureSource)
         )
      );
   }
}

export default ItemEntity;