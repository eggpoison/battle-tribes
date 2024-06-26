import RenderPart from "../render-parts/RenderPart";
import { createRockParticle, createRockSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS, playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randFloat, randItem } from "webgl-test-shared/dist/utils";

class Boulder extends Entity {
   private static readonly RADIUS = 40;

   private static readonly TEXTURE_SOURCES = [
      "entities/boulder/boulder1.png",
      "entities/boulder/boulder2.png"
   ];

   constructor(position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) {
      super(position, id, EntityType.boulder, ageTicks);

      const boulderComponentData = componentDataRecord[ServerComponentType.boulder]!;

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex(Boulder.TEXTURE_SOURCES[boulderComponentData.boulderType]),
            0,
            0
         )
      );
   }

   protected onHit(): void {
      for (let i = 0; i < 2; i++) {
         let moveDirection = 2 * Math.PI * Math.random();

         const spawnPositionX = this.position.x + Boulder.RADIUS * Math.sin(moveDirection);
         const spawnPositionY = this.position.y + Boulder.RADIUS * Math.cos(moveDirection);

         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Boulder.RADIUS, 0, 0, ParticleRenderLayer.low);
      }

      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      for (let i = 0; i < 5; i++) {
         const spawnOffsetMagnitude = Boulder.RADIUS * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Boulder.RADIUS, 0, 0, ParticleRenderLayer.low);
      }

      playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, this.position.x, this.position.y);
   }
}

export default Boulder;