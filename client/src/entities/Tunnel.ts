import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity, { ComponentDataRecord } from "../Entity";
import { TUNNEL_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Tunnel extends Entity {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.tunnel);

      const buildingMaterialComponentData = componentDataRecord[ServerComponentType.buildingMaterial]!;

      const renderPart = new TexturedRenderPart(
         this,
         1,
         0,
         getTextureArrayIndex(TUNNEL_TEXTURE_SOURCES[buildingMaterialComponentData.material])
      );
      this.attachRenderPart(renderPart);
   }
}

export default Tunnel;