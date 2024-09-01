import { EntityType } from "webgl-test-shared/dist/entities";
import { randFloat, randInt } from "webgl-test-shared/dist/utils";
import Particle from "../Particle";
import Board from "../Board";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { AudioFilePath, playSound } from "../sound";
import Entity from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class IceSpikes extends Entity {
   private static readonly ICE_SPECK_COLOUR: ParticleColour = [140/255, 143/255, 207/255];

   private static readonly SIZE = 80;

   constructor(id: number) {
      super(id, EntityType.iceSpikes);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(`entities/ice-spikes/ice-spikes.png`)
         )
      );
   }

   protected onHit(): void {
      // Create ice particles on hit
      for (let i = 0; i < 10; i++) {
         this.createIceSpeckProjectile();
      }
      
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound(("ice-spikes-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      for (let i = 0; i < 15; i++) {
         this.createIceSpeckProjectile();
      }
      
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("ice-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
   }

   private createIceSpeckProjectile(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + IceSpikes.SIZE / 2 * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + IceSpikes.SIZE / 2 * Math.cos(spawnOffsetDirection);

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