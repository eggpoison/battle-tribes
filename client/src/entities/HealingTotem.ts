import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import HealingTotemComponent from "../entity-components/HealingTotemComponent";
import StructureComponent from "../entity-components/StructureComponent";

class HealingTotem extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.healingTotem>) {
      super(position, id, EntityType.healingTotem, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/healing-totem/healing-totem.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.healingTotem, new HealingTotemComponent(this, componentsData[4]));
   }
}

export default HealingTotem;