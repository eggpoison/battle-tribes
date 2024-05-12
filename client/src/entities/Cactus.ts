import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import CactusComponent from "../entity-components/CactusComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import { createCactusSpineParticle } from "../particles";
import HealthComponent from "../entity-components/HealthComponent";
import Entity from "../Entity";

class Cactus extends Entity {
   public static readonly RADIUS = 40;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.cactus>) {
      super(position, id, EntityType.cactus, ageTicks);

      const baseRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/cactus/cactus.png"),
         2,
         0
      );
      this.attachRenderPart(baseRenderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.cactus, new CactusComponent(this, componentsData[2]));
   }

   protected onHit(): void {
      // Create cactus spine particles when hurt
      const numSpines = randInt(3, 5);
      for (let i = 0; i < numSpines; i++) {
         createCactusSpineParticle(this, Cactus.RADIUS - 5, 2 * Math.PI * Math.random());
      }

      playSound("cactus-hit.mp3", 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("cactus-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Cactus;