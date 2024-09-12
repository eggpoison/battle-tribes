import { ServerComponentType } from "battletribes-shared/components";
import { angle, randFloat } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { HitData } from "battletribes-shared/client-server-types";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createSnowParticle, createWhiteSmokeParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { YETI_SIZE } from "../entity-components/YetiComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Yeti extends Entity {
   private static readonly BLOOD_POOL_SIZE = 30;
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.15;

   constructor(id: number) {
      super(id, EntityType.yeti);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            1,
            0,
            getTextureArrayIndex("entities/yeti/yeti.png")
         )
      );

      for (let i = 0; i < 2; i++) {
         const paw = new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/yeti/yeti-paw.png")
         );
         paw.addTag("yetiComponent:paw");
         this.attachRenderThing(paw);
      }
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // Blood pool particle
      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, Yeti.BLOOD_POOL_SIZE);
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + YETI_SIZE / 2 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + YETI_SIZE / 2 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, Yeti.BLOOD_POOL_SIZE);

      createBloodParticleFountain(this, Yeti.BLOOD_FOUNTAIN_INTERVAL, 1.6);
   }
}

export default Yeti;