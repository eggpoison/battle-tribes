import { CowSpecies } from "battletribes-shared/entities";
import { angle, randFloat, randInt } from "battletribes-shared/utils";
import { HitData } from "battletribes-shared/client-server-types";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity from "../Entity";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent, { FootprintComponentArray } from "../entity-components/server-components/FootprintComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { CowComponentArray } from "../entity-components/server-components/CowComponent";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_HEIGHT = 96;

   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   public onLoad(): void {
      const cowComponent = CowComponentArray.getComponent(this.id);
      const cowNum = cowComponent.species === CowSpecies.brown ? 1 : 2;

      const renderInfo = getEntityRenderInfo(this.id);
      
      // Body
      const bodyRenderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(`entities/cow/cow-body-${cowNum}.png`)
      );
      bodyRenderPart.offset.y = -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2;
      renderInfo.attachRenderThing(bodyRenderPart);

      // Head
      const headRenderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex(`entities/cow/cow-head-${cowNum}.png`)
      );
      headRenderPart.offset.y = (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2;
      renderInfo.attachRenderThing(headRenderPart);

      FootprintComponentArray.addComponent(this.id, new FootprintComponent(this, 0.3, 20, 64, 5, 40));
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
            
      // Blood pool particles
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
      }
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }

      playSound("cow-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      for (let i = 0; i < 3; i++) {
         createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 35);
      }

      createBloodParticleFountain(this.id, Cow.BLOOD_FOUNTAIN_INTERVAL, 1.1);

      playSound("cow-die-1.mp3", 0.2, 1, transformComponent.position);
   }
}

export default Cow;