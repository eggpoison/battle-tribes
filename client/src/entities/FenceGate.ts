import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import FenceGateComponent from "../entity-components/FenceGateComponent";
import StructureComponent from "../entity-components/StructureComponent";

class FenceGate extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.fenceGate>) {
      super(position, id, EntityType.fenceGate, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/fence-gate/fence-gate-sides.png"),
            1,
            0
         )
      );

      const doorRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/fence-gate/fence-gate-door.png"),
         0,
         0
      );
      this.attachRenderPart(doorRenderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.fenceGate, new FenceGateComponent(this, componentsData[4], doorRenderPart));
   }
}

export default FenceGate;