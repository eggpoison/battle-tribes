import { randInt } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { createCactusSpineParticle } from "../particles";
import Entity from "../Entity";
import { CACTUS_RADIUS } from "../entity-components/CactusComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Cactus extends Entity {
   constructor(id: number) {
      super(id, EntityType.cactus);

      const baseRenderPart = new TexturedRenderPart(
         this,
         2,
         0,
         getTextureArrayIndex("entities/cactus/cactus.png")
      );
      this.attachRenderPart(baseRenderPart);
   }

   protected onHit(): void {
      // Create cactus spine particles when hurt
      const numSpines = randInt(3, 5);
      for (let i = 0; i < numSpines; i++) {
         createCactusSpineParticle(this, CACTUS_RADIUS - 5, 2 * Math.PI * Math.random());
      }

      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("cactus-hit.mp3", 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("cactus-destroy.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Cactus;