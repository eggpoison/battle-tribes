import { createRockParticle, createRockSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS, playSound } from "../sound";
import Entity from "../Entity";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { randFloat, randItem } from "webgl-test-shared/dist/utils";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Boulder extends Entity {
   private static readonly RADIUS = 40;

   private static readonly TEXTURE_SOURCES = [
      "entities/boulder/boulder1.png",
      "entities/boulder/boulder2.png"
   ];

   constructor(id: number) {
      super(id, EntityType.boulder);
   }

   public onLoad(): void {
      const boulderComponent = this.getServerComponent(ServerComponentType.boulder);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(Boulder.TEXTURE_SOURCES[boulderComponent.boulderType])
         )
      );
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      for (let i = 0; i < 2; i++) {
         let moveDirection = 2 * Math.PI * Math.random();

         const spawnPositionX = transformComponent.position.x + Boulder.RADIUS * Math.sin(moveDirection);
         const spawnPositionY = transformComponent.position.y + Boulder.RADIUS * Math.cos(moveDirection);

         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, Boulder.RADIUS, 0, 0, ParticleRenderLayer.low);
      }

      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      for (let i = 0; i < 5; i++) {
         const spawnOffsetMagnitude = Boulder.RADIUS * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, Boulder.RADIUS, 0, 0, ParticleRenderLayer.low);
      }

      playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, transformComponent.position);
   }
}

export default Boulder;