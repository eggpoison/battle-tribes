import { EntityType, SNOWBALL_SIZES, SnowballSize } from "webgl-test-shared/dist/entities";
import { randFloat, randInt } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import Board from "../Board";
import { createSnowParticle } from "../particles";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity, { ComponentDataRecord } from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

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
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.snowball);

      const snowballComponentData = componentDataRecord[ServerComponentType.snowball]!;

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex(getTextureSource(snowballComponentData.size))
         )
      );
   }

   public tick(): void {
      super.tick();
      
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      const physicsComponent = this.getServerComponent(ServerComponentType.physics);
      if ((physicsComponent.velocity.x !== 0 || physicsComponent.velocity.y !== 0) && physicsComponent.velocity.lengthSquared() > 2500) {
         if (Board.tickIntervalHasPassed(0.05)) {
            createSnowParticle(transformComponent.position.x, transformComponent.position.y, randFloat(40, 60));
         }
      }
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      const snowballComponent = this.getServerComponent(ServerComponentType.snowball);
      
      // Create a bunch of snow particles at the point of hit
      const numParticles = snowballComponent.size === SnowballSize.large ? 10 : 7;
      for (let i = 0; i < numParticles; i++) {
         const pixelSize = SNOWBALL_SIZES[snowballComponent.size];
         
         const position = transformComponent.position.offset(pixelSize / 2, 2 * Math.PI * Math.random());
         this.createSnowSpeckParticle(position.x, position.y);
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      const snowballComponent = this.getServerComponent(ServerComponentType.snowball);

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