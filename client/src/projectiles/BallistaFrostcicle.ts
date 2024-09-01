import { EntityType } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import { createArrowDestroyParticle } from "../particles";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class BallistaFrostcicle extends Entity {
   constructor(id: number) {
      super(id, EntityType.ballistaFrostcicle);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("projectiles/ballista-frostcicle.png")
         )
      );
   }

   public onRemove(): void {
      // Create arrow break particles
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      const physicsComponent = this.getServerComponent(ServerComponentType.physics);
      for (let i = 0; i < 6; i++) {
         createArrowDestroyParticle(transformComponent.position.x, transformComponent.position.y, physicsComponent.velocity.x, physicsComponent.velocity.y);
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      playSound("ice-break.mp3", 0.4, 1, transformComponent.position);
   }
}

export default BallistaFrostcicle;