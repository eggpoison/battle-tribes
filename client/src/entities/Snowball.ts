import { SNOWBALL_SIZES, SnowballSize } from "battletribes-shared/entities";
import { randFloat, randInt } from "battletribes-shared/utils";
import { HitData } from "battletribes-shared/client-server-types";
import Board from "../Board";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { SnowballComponentArray } from "../entity-components/server-components/SnowballComponent";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

const getTextureSource = (size: SnowballSize): string => {
   switch (size) {
      case SnowballSize.small: {
         return "entities/snowball/snowball-small.png";
      }
      case SnowballSize.large: {
         return "entities/snowball/snowball-large.png";
      }
   }
}

class Snowball extends Entity {
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const snowballComponentData = SnowballComponentArray.getComponent(this.id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(getTextureSource(snowballComponentData.size))
         )
      );
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const snowballComponent = SnowballComponentArray.getComponent(this.id);
      
      // Create a bunch of snow particles at the point of hit
      const numParticles = snowballComponent.size === SnowballSize.large ? 10 : 7;
      for (let i = 0; i < numParticles; i++) {
         const pixelSize = SNOWBALL_SIZES[snowballComponent.size];
         
         const position = transformComponent.position.offset(pixelSize / 2, 2 * Math.PI * Math.random());
         this.createSnowSpeckParticle(position.x, position.y);
      }
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const snowballComponent = SnowballComponentArray.getComponent(this.id);

      // Create a bunch of snow particles throughout the snowball
      const numParticles = snowballComponent.size === SnowballSize.large ? 25 : 15;
      for (let i = 0; i < numParticles; i++) {
         const pixelSize = SNOWBALL_SIZES[snowballComponent.size];
         
         const offsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + pixelSize / 2 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + pixelSize / 2 * Math.cos(offsetDirection);
         this.createSnowSpeckParticle(spawnPositionX, spawnPositionY);
      }
   }

   private createSnowSpeckParticle(spawnPositionX: number, spawnPositionY: number): void {
      const lifetime = randFloat(0.3, 0.4);

      const pixelSize = randInt(4, 8);
   
      const velocityMagnitude = randFloat(40, 80);
      const velocityDirection = 2 * Math.PI * Math.random();
      const velocityX = velocityMagnitude * Math.sin(velocityDirection);
      const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
      const particle = new Particle(lifetime);
      particle.getOpacity = (): number => {
         return 1 - particle.age / lifetime;
      };
   
      const colour = randFloat(0.7, 0.95);
   
      addMonocolourParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         pixelSize, pixelSize,
         spawnPositionX, spawnPositionY,
         velocityX, velocityY,
         0, 0,
         velocityMagnitude / lifetime / 1.2,
         2 * Math.PI * Math.random(),
         0,
         0,
         0,
         colour, colour, colour
      );
      Board.lowMonocolourParticles.push(particle);
   }
}

export default Snowball;