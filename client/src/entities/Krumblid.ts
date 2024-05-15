import { HitData } from "webgl-test-shared/dist/client-server-types";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import Entity from "../Entity";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import HealthComponent from "../entity-components/HealthComponent";
import PhysicsComponent from "../entity-components/PhysicsComponent";

class Krumblid extends Entity {
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.krumblid>) {
      super(position, id, EntityType.krumblid, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/krumblid/krumblid.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 64, 5, 50));
   }

   protected onHit(hitData: HitData): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 5; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public onDie(): void {
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(this.position.x, this.position.y, 35);
      }

      createBloodParticleFountain(this, Krumblid.BLOOD_FOUNTAIN_INTERVAL, 0.8);
   }
}

export default Krumblid;