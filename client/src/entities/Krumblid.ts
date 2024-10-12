import { HitData } from "battletribes-shared/client-server-types";
import { angle, randFloat } from "battletribes-shared/utils";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "../entity-components/TransformComponent";
import { getEntityRenderInfo } from "../world";

class Krumblid extends Entity {
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/krumblid/krumblid.png")
         )
      );

      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 64, 5, 50));
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      
      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
      
      // Blood particles
      for (let i = 0; i < 5; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 35);
      }

      createBloodParticleFountain(this.id, Krumblid.BLOOD_FOUNTAIN_INTERVAL, 0.8);
   }
}

export default Krumblid;