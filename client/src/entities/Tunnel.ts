import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { BuildingMaterialComponentArray, TUNNEL_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";

class Tunnel extends Entity {
   public onLoad(): void {
      const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(this.id);

      const renderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex(TUNNEL_TEXTURE_SOURCES[buildingMaterialComponent.material])
      );

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(renderPart);
   }
}

export default Tunnel;