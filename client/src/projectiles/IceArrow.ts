import { Settings } from "webgl-test-shared/dist/settings";
import { randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import Board from "../Board";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import { createSnowflakeParticle } from "../particles";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class IceArrow extends Entity {
   constructor(id: number) {
      super(id, EntityType.iceArrow);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("projectiles/ice-arrow.png")
         )
      );
   }

   public tick(): void {
      super.tick();

      if (Math.random() < 30 / Settings.TPS) {
         const transformComponent = this.getServerComponent(ServerComponentType.transform);
         createSnowflakeParticle(transformComponent.position.x, transformComponent.position.y);
      }

      if (Math.random() < 30 / Settings.TPS) {
         // @Incomplete: These types of particles don't fit
         this.createIceSpeckProjectile();
      }

      // @Incomplete: Need snow speck particles
   }

   public onRemove(): void {
      for (let i = 0; i < 6; i++) {
         this.createIceSpeckProjectile();
      }
   }

   private createIceSpeckProjectile(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + 4 * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + 4 * Math.cos(spawnOffsetDirection);

      const velocityMagnitude = randFloat(150, 300);
      const velocityDirection = spawnOffsetDirection + randFloat(-0.8, 0.8);
      const velocityX = velocityMagnitude * Math.sin(velocityDirection);
      const velocityY = velocityMagnitude * Math.cos(velocityDirection);
      
      const lifetime = randFloat(0.1, 0.2);
      
      const particle = new Particle(lifetime);
      particle.getOpacity = () => {
         return 1 - Math.pow(particle.age / particle.lifetime, 2);
      }

      const pixelSize = Math.random() < 0.5 ? 4 : 8;

      addMonocolourParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         pixelSize,
         pixelSize,
         spawnPositionX, spawnPositionY,
         velocityX, velocityY,
         0, 0,
         0,
         velocityDirection,
         0,
         0,
         0,
         140/255, 143/255, 207/255
      );
      Board.lowMonocolourParticles.push(particle);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("arrow-hit.mp3", 0.4, 1, transformComponent.position);
   }
}

export default IceArrow;