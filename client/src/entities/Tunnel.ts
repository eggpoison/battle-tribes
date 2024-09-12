import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { TUNNEL_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Tunnel extends Entity {
   constructor(id: number) {
      super(id, EntityType.tunnel);
   }

   public onLoad(): void {
      const buildingMaterialComponent = this.getServerComponent(ServerComponentType.buildingMaterial);

      const renderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex(TUNNEL_TEXTURE_SOURCES[buildingMaterialComponent.material])
      );
      this.attachRenderThing(renderPart);
   }
}

export default Tunnel;