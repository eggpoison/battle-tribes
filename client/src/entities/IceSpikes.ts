import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import Particle from "../Particle";
import Board from "../Board";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { AudioFilePath, playSound } from "../sound";
import Entity from "../Entity";

class IceSpikes extends Entity {
   private static readonly ICE_SPECK_COLOUR: ParticleColour = [140/255, 143/255, 207/255];

   private static readonly SIZE = 80;

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.iceSpikes, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex(`entities/ice-spikes/ice-spikes.png`),
            0,
            0
         )
      );
   }

   protected onHit(): void {
      // Create ice particles on hit
      for (let i = 0; i < 10; i++) {
         this.createIceSpeckProjectile();
      }
      
      playSound(("ice-spikes-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      for (let i = 0; i < 15; i++) {
         this.createIceSpeckProjectile();
      }

      playSound("ice-spikes-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }

   private createIceSpeckProjectile(): void {
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = this.position.x + IceSpikes.SIZE / 2 * Math.sin(spawnOffsetDirection);
      const spawnPositionY = this.position.y + IceSpikes.SIZE / 2 * Math.cos(spawnOffsetDirection);

      const velocityMagnitude = randFloat(150, 300);
      const velocityDirection = spawnOffsetDirection + randFloat(-0.8, 0.8);
      const velocityX = velocityMagnitude * Math.sin(velocityDirection);
      const velocityY = velocityMagnitude * Math.cos(velocityDirection);
      
      const lifetime = randFloat(0.1, 0.2);
      
      const particle = new Particle(lifetime);
      particle.getOpacity = () => {
         return 1 - Math.pow(particle.age / particle.lifetime, 2);
      }

      addMonocolourParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         4,
         8,
         spawnPositionX, spawnPositionY,
         velocityX, velocityY,
         0, 0,
         0,
         velocityDirection,
         0,
         0,
         0,
         IceSpikes.ICE_SPECK_COLOUR[0], IceSpikes.ICE_SPECK_COLOUR[1], IceSpikes.ICE_SPECK_COLOUR[2]
      );
      Board.lowMonocolourParticles.push(particle);
   }
}

export default IceSpikes;