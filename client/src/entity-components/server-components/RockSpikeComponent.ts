import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { lerp, randFloat, randInt } from "battletribes-shared/utils";
import { RenderPart } from "../../render-parts/render-parts";
import { getEntityAgeTicks, getEntityRenderInfo } from "../../world";
import { EntityID } from "../../../../shared/src/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import Board from "../../Board";
import Particle from "../../Particle";
import { createRockParticle } from "../../particles";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";

const enum Vars {
   ENTRANCE_SHAKE_DURATION = 0.5,
   EXIT_SHAKE_DURATION = 0.8
}

const SIZES = [12 * 4, 16 * 4, 20 * 4];
const SPRITE_TEXTURE_SOURCES = [
   "projectiles/rock-spike-small.png",
   "projectiles/rock-spike-medium.png",
   "projectiles/rock-spike-large.png"
];

const ENTRANCE_SHAKE_AMOUNTS = [2, 3.5, 5];
const ENTRANCE_SCALE = 0.65;

const EXIT_SHAKE_AMOUNTS = [1.25, 2.25, 3.25];

class RockSpikeComponent {
   public size = 0;
   public lifetime = 0;
   
   public renderPart!: RenderPart;
}

export default RockSpikeComponent;

export const RockSpikeComponentArray = new ServerComponentArray<RockSpikeComponent>(ServerComponentType.rockSpike, true, {
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function onLoad(rockSpikeComponent: RockSpikeComponent, entity: EntityID): void {
   const renderInfo = getEntityRenderInfo(entity);

   renderInfo.shakeAmount = ENTRANCE_SHAKE_AMOUNTS[rockSpikeComponent.size];
   
   rockSpikeComponent.renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(SPRITE_TEXTURE_SOURCES[rockSpikeComponent.size])
   );
   rockSpikeComponent.renderPart.addTag("rockSpikeProjectile:part");
   rockSpikeComponent.renderPart.scale = ENTRANCE_SCALE;
   renderInfo.attachRenderThing(rockSpikeComponent.renderPart);

   // 
   // Create debris particles
   // 

   let numSpeckParticles!: number;
   let numTexturedParticles!: number;
   switch (rockSpikeComponent.size) {
      case 0: {
         numSpeckParticles = randInt(2, 3);
         numTexturedParticles = randInt(2, 3);
         break;
      }
      case 1: {
         numSpeckParticles = randInt(4, 5);
         numTexturedParticles = randInt(4, 5);
         break;
      }
      case 2: {
         numSpeckParticles = randInt(6, 8);
         numTexturedParticles = randInt(6, 8);
         break;
      }
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < numSpeckParticles; i++) {
      // @Cleanup: Move to particles file
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + SIZES[rockSpikeComponent.size] / 2 * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + SIZES[rockSpikeComponent.size] / 2 * Math.cos(spawnOffsetDirection);
      
      const lifetime = randFloat(1, 1.2);
   
      const velocityMagnitude = randFloat(60, 100);
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
   }

   for (let i = 0; i < numTexturedParticles; i++) {
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + SIZES[rockSpikeComponent.size] / 2 * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + SIZES[rockSpikeComponent.size] / 2 * Math.cos(spawnOffsetDirection);

      createRockParticle(spawnPositionX, spawnPositionY, spawnOffsetDirection + randFloat(-0.5, 0.5), randFloat(80, 125), ParticleRenderLayer.low);
   }
}

function onTick(rockSpikeComponent: RockSpikeComponent, entity: EntityID): void {
   const renderInfo = getEntityRenderInfo(entity);

   const ageSeconds = getEntityAgeTicks(entity) / Settings.TPS;
   if (ageSeconds < Vars.ENTRANCE_SHAKE_DURATION) {
      // Entrance
      const entranceProgress = ageSeconds / Vars.ENTRANCE_SHAKE_DURATION;
      renderInfo.shakeAmount = lerp(ENTRANCE_SHAKE_AMOUNTS[rockSpikeComponent.size], 0, entranceProgress);
      rockSpikeComponent.renderPart.scale = lerp(ENTRANCE_SCALE, 1, Math.pow(entranceProgress, 0.5));
   } else if (ageSeconds > rockSpikeComponent.lifetime - Vars.EXIT_SHAKE_DURATION) {
      // Exit
      const exitProgress = (ageSeconds - (rockSpikeComponent.lifetime - Vars.EXIT_SHAKE_DURATION)) / Vars.EXIT_SHAKE_DURATION;
      renderInfo.shakeAmount = lerp(0, EXIT_SHAKE_AMOUNTS[rockSpikeComponent.size], exitProgress);
      rockSpikeComponent.renderPart.opacity = 1 - Math.pow(exitProgress, 2);
      rockSpikeComponent.renderPart.scale = 1 - lerp(0, 0.5, Math.pow(exitProgress, 2));
   } else {
      renderInfo.shakeAmount = 0;
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const rockSpikeComponent = RockSpikeComponentArray.getComponent(entity);
   
   rockSpikeComponent.size = reader.readNumber();
   rockSpikeComponent.lifetime = reader.readNumber();
}