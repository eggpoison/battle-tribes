import Entity from "../Entity";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { ItemComponentArray } from "../entity-components/server-components/ItemComponent";
import { getEntityRenderInfo } from "../world";

class ItemEntity extends Entity {
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const itemComponent = ItemComponentArray.getComponent(this.id);
      
      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponent.itemType].entityTextureSource)
         )
      );
   }
}

export default ItemEntity;