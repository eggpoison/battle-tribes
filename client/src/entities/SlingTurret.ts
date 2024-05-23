import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import TurretComponent from "../entity-components/TurretComponent";
import TribeComponent from "../entity-components/TribeComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import HealthComponent from "../entity-components/HealthComponent";
import Entity from "../Entity";
import StructureComponent from "../entity-components/StructureComponent";

class SlingTurret extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.slingTurret>) {
      super(position, id, EntityType.slingTurret, ageTicks);

      // Base
      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/sling-turret/sling-turret-base.png"),
            0,
            0
         )
      );

      // Plate
      const plateRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png"),
         1,
         0
      );
      this.attachRenderPart(plateRenderPart);

      // Sling
      const slingRenderPart = new RenderPart(
         plateRenderPart,
         getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png"),
         2,
         0
      );
      this.attachRenderPart(slingRenderPart);
      
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.turret, new TurretComponent(this, componentsData[4], slingRenderPart, plateRenderPart, []));
   }
}

export default SlingTurret;