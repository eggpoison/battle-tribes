import { Point, randInt } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import { createCactusSpineParticle } from "../particles";
import Entity from "../Entity";
import { CACTUS_RADIUS } from "../entity-components/CactusComponent";

class Cactus extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.cactus, ageTicks);

      const baseRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/cactus/cactus.png"),
         2,
         0
      );
      this.attachRenderPart(baseRenderPart);
   }

   protected onHit(): void {
      // Create cactus spine particles when hurt
      const numSpines = randInt(3, 5);
      for (let i = 0; i < numSpines; i++) {
         createCactusSpineParticle(this, CACTUS_RADIUS - 5, 2 * Math.PI * Math.random());
      }

      playSound("cactus-hit.mp3", 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("cactus-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Cactus;