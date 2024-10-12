import { randInt } from "battletribes-shared/utils";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { createCactusSpineParticle } from "../particles";
import Entity from "../Entity";
import { CACTUS_RADIUS } from "../entity-components/CactusComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/TransformComponent";

class Cactus extends Entity {
   constructor(id: number) {
      super(id);

      const baseRenderPart = new TexturedRenderPart(
         null,
         2,
         0,
         getTextureArrayIndex("entities/cactus/cactus.png")
      );

      const renderInfo = getEntityRenderInfo(id);
      renderInfo.attachRenderThing(baseRenderPart);
   }

   protected onHit(): void {
      // Create cactus spine particles when hurt
      const numSpines = randInt(3, 5);
      for (let i = 0; i < numSpines; i++) {
         createCactusSpineParticle(this, CACTUS_RADIUS - 5, 2 * Math.PI * Math.random());
      }

      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("cactus-hit.mp3", 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("cactus-destroy.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Cactus;