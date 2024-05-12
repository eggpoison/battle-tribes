import { FrozenYetiComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { FrozenYetiAttackType } from "webgl-test-shared/dist/entities";
import { randFloat, randInt } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
import Entity from "../Entity";
import FrozenYeti from "../entities/FrozenYeti";
import { createBiteParticle, createRockParticle, createSnowParticle, createWhiteSmokeParticle } from "../particles";
import Board from "../Board";
import Particle from "../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";

class FrozenYetiComponent extends ServerComponent<ServerComponentType.frozenYeti> {
   public readonly headRenderPart: RenderPart;
   /** Index 0: left paw, index 1: right paw */
   public readonly pawRenderParts: ReadonlyArray<RenderPart>;
   
   public attackType: FrozenYetiAttackType;
   public attackStage: number;
   public stageProgress: number;

   constructor(entity: Entity, data: FrozenYetiComponentData, headRenderPart: RenderPart, pawRenderParts: ReadonlyArray<RenderPart>) {
      super(entity);

      this.attackType = data.attackType;
      this.attackStage = data.attackStage;
      this.stageProgress = data.stageProgress;

      this.headRenderPart = headRenderPart;
      this.pawRenderParts = pawRenderParts;
   }

   public updateFromData(data: FrozenYetiComponentData): void {
      // If the yeti did a bite attack, create a bite particle
      if (this.attackType === FrozenYetiAttackType.bite && data.attackStage === 2 && this.attackStage === 1) {
         const spawnPositionX = this.entity.position.x + 140 * Math.sin(this.entity.rotation);
         const spawnPositionY = this.entity.position.y + 140 * Math.cos(this.entity.rotation);
         
         createBiteParticle(spawnPositionX, spawnPositionY);
      }
      // If the yeti did a snow throw attack, create impact particles
      if (this.attackType === FrozenYetiAttackType.snowThrow && data.attackStage === 2 && this.attackStage === 1) {
         const offsetMagnitude = FrozenYeti.SNOWBALL_THROW_OFFSET + 20;
         const impactPositionX = this.entity.position.x + offsetMagnitude * Math.sin(this.entity.rotation);
         const impactPositionY = this.entity.position.y + offsetMagnitude * Math.cos(this.entity.rotation);
         
         for (let i = 0; i < 30; i++) {
            const offsetMagnitude = randFloat(0, 20);
            const offsetDirection = 2 * Math.PI * Math.random();
            const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
            const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
            
            createSnowParticle(positionX, positionY, randFloat(40, 100));
         }

         // White smoke particles
         for (let i = 0; i < 10; i++) {
            const spawnPositionX = impactPositionX;
            const spawnPositionY = impactPositionY;
            createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
         }
      }

      this.attackType = data.attackType;
      this.attackStage = data.attackStage;
      this.stageProgress = data.stageProgress;

      for (const positionData of data.rockSpikePositions) {
         if (Math.random() < 5 / Settings.TPS) {
            if (Math.random() < 0.5) {
               // @Cleanup: Move to particles file
               
               const spawnOffsetMagnitude = randFloat(0, 5);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               const spawnPositionX = positionData[0] + spawnOffsetMagnitude / 2 * Math.sin(spawnOffsetDirection);
               const spawnPositionY = positionData[1] + spawnOffsetMagnitude / 2 * Math.cos(spawnOffsetDirection);
               
               const lifetime = randFloat(1, 1.2);
            
               const velocityMagnitude = randFloat(30, 50);
               const velocityDirection = spawnOffsetDirection + randFloat(-0.5, 0.5);
               const velocityX = velocityMagnitude * Math.sin(velocityDirection);
               const velocityY = velocityMagnitude * Math.cos(velocityDirection);
               
               const particle = new Particle(lifetime);
               particle.getOpacity = (): number => {
                  return 1 - particle.age / lifetime;
               };
            
               const pixelSize = 4 * randInt(1, 2);
            
               const colour = randFloat(0.3, 0.5);
               
               addMonocolourParticleToBufferContainer(
                  particle,
                  ParticleRenderLayer.low,
                  pixelSize, pixelSize,
                  spawnPositionX, spawnPositionY,
                  velocityX, velocityY,
                  0, 0,
                  0,
                  2 * Math.PI * Math.random(),
                  0,
                  0,
                  0,
                  colour, colour, colour
               );
               Board.lowMonocolourParticles.push(particle);
            } else {
               const spawnOffsetMagnitude = randFloat(0, 5);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               const spawnPositionX = positionData[0] + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               const spawnPositionY = positionData[1] + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
               createRockParticle(spawnPositionX, spawnPositionY, spawnOffsetDirection + randFloat(-0.5, 0.5), randFloat(80, 125), ParticleRenderLayer.low);
            }
         }
      }
   }
}

export default FrozenYetiComponent;