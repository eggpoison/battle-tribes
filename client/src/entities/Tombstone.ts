import RenderPart from "../render-parts/RenderPart";
import { createRockParticle, createRockSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound, ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { Point, randFloat, randItem } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";

class Tombstone extends Entity {
   private static readonly HITBOX_WIDTH = 48;
   private static readonly HITBOX_HEIGHT = 88;
   
   constructor(position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) {
      super(position, id, EntityType.tombstone, ageTicks);

      const tombstoneComponentData = componentDataRecord[ServerComponentType.tombstone]!;

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex(`entities/tombstone/tombstone${tombstoneComponentData.tombstoneType + 1}.png`),
            0,
            0
         )
      );
   }

   protected onHit(): void {
      for (let i = 0; i < 4; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         let moveDirection = Math.PI/2 - Math.atan2(spawnPositionY, spawnPositionX);
         moveDirection += randFloat(-1, 1);
         
         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 8; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
      }

      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      for (let i = 0; i < 8; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
      }

      playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, this.position.x, this.position.y);
   }
}

export default Tombstone;