import { EntityType } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { createArrowDestroyParticle } from "../particles";

class BallistaWoodenBolt extends Entity {
   constructor(id: number) {
      super(id, EntityType.ballistaWoodenBolt);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("projectiles/wooden-bolt.png"),
            0,
            0
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
}

export default BallistaWoodenBolt;