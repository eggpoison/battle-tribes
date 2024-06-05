import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity, { ComponentDataRecord } from "../Entity";
import { TUNNEL_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";

class Tunnel extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) {
      super(position, id, EntityType.tunnel, ageTicks);

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