import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity, { ComponentDataRecord } from "../Entity";
import { TUNNEL_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";

class Tunnel extends Entity {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.tunnel);

      const buildingMaterialComponentData = componentDataRecord[ServerComponentType.buildingMaterial]!;

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(TUNNEL_TEXTURE_SOURCES[buildingMaterialComponentData.material]),
         1,
         0
      );
      this.attachRenderPart(renderPart);
   }
}

export default Tunnel;