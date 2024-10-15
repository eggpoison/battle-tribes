import Entity from "../Entity";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { createGenericGemParticle } from "../particles";
import { playSound } from "../sound";

export default class GuardianSpikyBall extends Entity {
   protected onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("guardian-spiky-ball-death.mp3", 0.4, 1, transformComponent.position);

      for (let i = 0; i < 10; i++) {
         const offsetMagnitude = 10 * Math.random();

         createGenericGemParticle(transformComponent, offsetMagnitude, 0.7, 0.16, 0.7);
      }
   }
}