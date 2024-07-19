import { EntityType } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { createArrowDestroyParticle, createRockParticle, createRockSpeckParticle } from "../particles";
import { randFloat } from "webgl-test-shared/dist/utils";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class SlingTurretRock extends Entity {
   constructor(id: number) {
      super(id, EntityType.slingTurretRock);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("projectiles/sling-rock.png")
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

   protected onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      for (let i = 0; i < 3; i++) {
         const spawnOffsetMagnitude = 16 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(60, 100), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, 16, 0, 0, ParticleRenderLayer.low);
      }
   }
}

export default SlingTurretRock;