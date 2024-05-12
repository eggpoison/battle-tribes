import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import HealthComponent from "../entity-components/HealthComponent";
import Entity from "../Entity";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TunnelComponent from "../entity-components/TunnelComponent";
import BuildingMaterialComponent, { TUNNEL_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import TribeComponent from "../entity-components/TribeComponent";

class Tunnel extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tunnel>) {
      super(position, id, EntityType.tunnel, ageTicks);

      const buildingMaterialComponentData = componentsData[4];

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(TUNNEL_TEXTURE_SOURCES[buildingMaterialComponentData.material]),
         1,
         0
      );
      this.attachRenderPart(renderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tunnel, new TunnelComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.buildingMaterial, new BuildingMaterialComponent(this, componentsData[4], renderPart));
   }
}

export default Tunnel;