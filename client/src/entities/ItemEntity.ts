import { EntityType } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class ItemEntity extends Entity {
   constructor(id: number) {
      super(id, EntityType.itemEntity);
   }

   public onLoad(): void {
      const itemComponent = this.getServerComponent(ServerComponentType.item);
      
      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponent.itemType].entityTextureSource)
         )
      );
   }
}

export default ItemEntity;