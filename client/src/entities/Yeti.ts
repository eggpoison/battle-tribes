import { angle, randFloat } from "battletribes-shared/utils";
import { HitData } from "battletribes-shared/client-server-types";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import Entity from "../Entity";
import { YETI_SIZE } from "../entity-components/YetiComponent";
import { ClientComponentType } from "../entity-components/components";
import RandomSoundComponent from "../entity-components/client-components/RandomSoundComponent";
import { TransformComponentArray } from "../entity-components/TransformComponent";

class Yeti extends Entity {
   private static readonly BLOOD_POOL_SIZE = 30;
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.15;

   constructor(id: number) {
      super(id);

      this.addClientComponent(ClientComponentType.randomSound, new RandomSoundComponent(this));
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

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
      const transformComponent = TransformComponentArray.getComponent(this.id);

      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, Yeti.BLOOD_POOL_SIZE);

      createBloodParticleFountain(this.id, Yeti.BLOOD_FOUNTAIN_INTERVAL, 1.6);
   }
}

export default Yeti;