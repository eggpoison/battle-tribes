import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { createArrowDestroyParticle } from "../particles";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PhysicsComponentArray } from "../entity-components/server-components/PhysicsComponent";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { getEntityRenderInfo } from "../world";

class BallistaSlimeball extends Entity {
   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("projectiles/ballista-slimeball.png")
         )
      );
   }

   public onRemove(): void {
      // Create arrow break particles
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const physicsComponent = PhysicsComponentArray.getComponent(this.id);
      for (let i = 0; i < 6; i++) {
         createArrowDestroyParticle(transformComponent.position.x, transformComponent.position.y, physicsComponent.selfVelocity.x, physicsComponent.selfVelocity.y);
      }
   }
}

export default BallistaSlimeball;