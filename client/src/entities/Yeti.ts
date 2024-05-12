import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Point, lerp, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createSnowParticle, createWhiteSmokeParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import YetiComponent from "../entity-components/YetiComponent";
import Entity from "../Entity";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";

class Yeti extends Entity {
   private static readonly SIZE = 128;

   private static readonly PAW_START_ANGLE = Math.PI/3;
   private static readonly PAW_END_ANGLE = Math.PI/6;

   private static readonly SNOW_THROW_OFFSET = 64;

   private static readonly BLOOD_POOL_SIZE = 30;
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.15;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.yeti>) {
      super(position, id, EntityType.yeti, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/yeti/yeti.png"),
            1,
            0
         )
      );

      const yetiComponent = new YetiComponent(this, componentsData[5]);
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.yeti, yetiComponent);
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.55, 40, 96, 8, 64));

      for (let i = 0; i < 2; i++) {
         const paw = this.createPaw();
         yetiComponent.pawRenderParts.push(paw);
      }
      this.updatePaws();
   }
   
   private createPaw(): RenderPart {
      const paw = new RenderPart(
         this,
         getTextureArrayIndex("entities/yeti/yeti-paw.png"),
         0,
         0
      );
      this.attachRenderPart(paw);
      return paw;
   }

   private updatePaws(): void {
      const yetiComponent = this.getServerComponent(ServerComponentType.yeti);

      let attackProgress = yetiComponent.attackProgress;
      attackProgress = Math.pow(attackProgress, 0.75);
      
      for (let i = 0; i < 2; i++) {
         const paw = yetiComponent.pawRenderParts[i];

         const angle = lerp(Yeti.PAW_END_ANGLE, Yeti.PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
         paw.offset.x = Yeti.SIZE/2 * Math.sin(angle);
         paw.offset.y = Yeti.SIZE/2 * Math.cos(angle);
      }
   }

   public tick(): void {
      super.tick();

      this.updatePaws();

      // Create snow impact particles when the Yeti does a throw attack
      const yetiComponent = this.getServerComponent(ServerComponentType.yeti);
      if (yetiComponent.attackProgress === 0 && yetiComponent.lastAttackProgress !== 0) {
         const offsetMagnitude = Yeti.SNOW_THROW_OFFSET + 20;
         const impactPositionX = this.position.x + offsetMagnitude * Math.sin(this.rotation);
         const impactPositionY = this.position.y + offsetMagnitude * Math.cos(this.rotation);
         
         for (let i = 0; i < 30; i++) {
            const offsetMagnitude = randFloat(0, 20);
            const offsetDirection = 2 * Math.PI * Math.random();
            const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
            const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
            
            createSnowParticle(positionX, positionY, randFloat(40, 100));
         }

         // White smoke particles
         for (let i = 0; i < 10; i++) {
            const spawnPositionX = impactPositionX;
            const spawnPositionY = impactPositionY;
            createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
         }
      }
      yetiComponent.lastAttackProgress = yetiComponent.attackProgress;
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBloodPoolParticle(this.position.x, this.position.y, Yeti.BLOOD_POOL_SIZE);
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + Yeti.SIZE / 2 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + Yeti.SIZE / 2 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, Yeti.BLOOD_POOL_SIZE);

      createBloodParticleFountain(this, Yeti.BLOOD_FOUNTAIN_INTERVAL, 1.6);
   }
}

export default Yeti;