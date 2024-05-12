import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";

class Pebblum extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.pebblum>) {
      super(position, id, EntityType.pebblum, ageTicks);

      // Nose
      const nose = new RenderPart(
         this,
         getTextureArrayIndex("entities/pebblum/pebblum-nose.png"),
         0,
         2 * Math.PI * Math.random()
      )
      nose.offset.y = 12;
      this.attachRenderPart(nose);

      // Body
      const body = new RenderPart(
         this,
         getTextureArrayIndex("entities/pebblum/pebblum-body.png"),
         1,
         2 * Math.PI * Math.random()
      )
      body.offset.y = -8;
      this.attachRenderPart(body);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 64, 5, 40));
   }
}

export default Pebblum;