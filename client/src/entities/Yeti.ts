import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Point, angle, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createSnowParticle, createWhiteSmokeParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "../Entity";
import { YETI_SIZE } from "../entity-components/YetiComponent";

class Yeti extends Entity {
   private static readonly SNOW_THROW_OFFSET = 64;

   private static readonly BLOOD_POOL_SIZE = 30;
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.15;

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.yeti, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/yeti/yeti.png"),
            1,
            0
         )
      );

      for (let i = 0; i < 2; i++) {
         const paw = new RenderPart(
            this,
            getTextureArrayIndex("entities/yeti/yeti-paw.png"),
            0,
            0
         );
         paw.addTag("yetiComponent:paw");
         this.attachRenderPart(paw);
      }
   }

   public tick(): void {
      super.tick();

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
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - this.position.x, hitData.hitPosition[1] - this.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = this.position.x + YETI_SIZE / 2 * Math.sin(offsetDirection);
         const spawnPositionY = this.position.y + YETI_SIZE / 2 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, Yeti.BLOOD_POOL_SIZE);

      createBloodParticleFountain(this, Yeti.BLOOD_FOUNTAIN_INTERVAL, 1.6);
   }
}

export default Yeti;