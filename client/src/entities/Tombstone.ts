import { createRockParticle, createRockSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound, ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS } from "../sound";
import Entity from "../Entity";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { randFloat, randItem } from "battletribes-shared/utils";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { TombstoneComponentArray } from "../entity-components/TombstoneComponent";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/TransformComponent";

class Tombstone extends Entity {
   private static readonly HITBOX_WIDTH = 48;
   private static readonly HITBOX_HEIGHT = 88;
   
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const tombstoneComponent = TombstoneComponentArray.getComponent(this.id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(`entities/tombstone/tombstone${tombstoneComponent.tombstoneType + 1}.png`)
         )
      );
   }

   protected onHit(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      for (let i = 0; i < 4; i++) {
         const spawnPositionX = transformComponent.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = transformComponent.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         let moveDirection = Math.PI/2 - Math.atan2(spawnPositionY, spawnPositionX);
         moveDirection += randFloat(-1, 1);
         
         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 8; i++) {
         const spawnPositionX = transformComponent.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = transformComponent.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
      }

      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      for (let i = 0; i < 8; i++) {
         const spawnPositionX = transformComponent.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = transformComponent.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         const spawnPositionX = transformComponent.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = transformComponent.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
      }

      playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, transformComponent.position);
   }
}

export default Tombstone;