import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import StructureComponent from "../entity-components/StructureComponent";
import TribeComponent from "../entity-components/TribeComponent";

class Workbench extends Entity {
   public static readonly SIZE = 80;
   
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.workbench>) {
      super(position, id, EntityType.workbench, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/workbench/workbench.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
   }
}

export default Workbench;