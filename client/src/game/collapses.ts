import { Settings, SubtileType, customTickIntervalHasPassed, lerp, Point, randAngle, randFloat, randInt, getSubtileX, getSubtileY } from "webgl-test-shared";
import Particle from "./Particle";
import { addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer, highMonocolourParticles, lowMonocolourParticles, lowTexturedParticles, ParticleRenderLayer } from "./rendering/webgl/particle-rendering";
import { playSound } from "./sound";
import { undergroundLayer } from "./world";

export interface MinedSubtile {
   readonly subtileIndex: number;
   readonly subtileType: SubtileType;
   readonly support: number;
   readonly isCollapsing: boolean;
}

let minedSubtiles: ReadonlyArray<MinedSubtile>;

// @Hardcoded
const COLLAPSE_THRESHOLD = 50;

export function setMinedSubtiles(subtiles: ReadonlyArray<MinedSubtile>): void {
   // const newMinedSubtiles = new Array<number>();
   // for (const minedSubtile of subtiles) {
   //    if (!minedSubtile.isCollapsing) {
   //       continue;
   //    }
      
   //    const subtileIndex = minedSubtile.subtileIndex;

   //    // Check if it's new
   //    let isNew = true;
   //    for (const otherMinedSubtile of minedSubtiles) {
   //       if (otherMinedSubtile.subtileIndex === subtileIndex) {
   //          isNew = false;
   //          break;
   //       }
   //    }

   //    if (isNew) {
   //       newMinedSubtiles.push(subtileIndex);
   //    }
   // }

   // // @Bug: will only play once if multiple collapses occur in the same tick
   // // Play sounds 
   // if (newMinedSubtiles.length > 0) {
   //    let closestSubtile!: number;
   //    let minDist = Number.MAX_SAFE_INTEGER;
   //    for (const subtileIndex of newMinedSubtiles) {
   //       const subtileX = getSubtileX(subtileIndex);
   //       const subtileY = getSubtileY(subtileIndex);

   //       const x = subtileX * Settings.SUBTILE_SIZE;
   //       const y = subtileY * Settings.SUBTILE_SIZE;

   //       const dist = distance(x, y, cameraPosition.x, cameraPosition.y);
   //       if (dist < minDist) {
   //          minDist = dist;
   //          closestSubtile = subtileIndex;
   //       }
   //    }

   //    const subtileX = getSubtileX(closestSubtile);
   //    const subtileY = getSubtileY(closestSubtile);

   //    const x = subtileX * Settings.SUBTILE_SIZE;
   //    const y = subtileY * Settings.SUBTILE_SIZE;

   //    playSound("wall-collapse-" + randInt(1, 2) + ".mp3", 0.4, 1, new Point(x, y));
   // }
   
   minedSubtiles = subtiles;
}

export function tickCollapse(collapsingSubtileIndex: number, ageTicks: number): void {
   if (customTickIntervalHasPassed(ageTicks, 0.3)) {
      const subtileX = getSubtileX(collapsingSubtileIndex);
      const subtileY = getSubtileY(collapsingSubtileIndex);

      const x = subtileX * Settings.SUBTILE_SIZE;
      const y = subtileY * Settings.SUBTILE_SIZE;

      playSound("wall-collapse-" + randInt(1, 2) + ".mp3", 0.4, 1, new Point(x, y), undergroundLayer);
   }
}

const createSpeckDebris = (x: number, y: number, subtileType: SubtileType): void => {
   // @Copynpaste from Layer registerSubtileUpdate function
   
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = x + 12 * Math.sin(spawnOffsetDirection);
   const spawnPositionY = y + 12 * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(50, 70);
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.9, 1.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;
   
   let colour: number;
   if (subtileType === SubtileType.stoneWall) {
      colour = randFloat(0.25, 0.55);
   } else if (subtileType === SubtileType.rockWall) {
      colour = randFloat(0.5, 0.75);
   } else {
      throw new Error(subtileType.toString());
   }
   
   const scale = randFloat(1, 1.35);

   const baseSize = Math.random() < 0.6 ? 4 : 6;

   const particleRenderLayer = Math.random() < 0.5 ? ParticleRenderLayer.high : ParticleRenderLayer.low;
   
   addMonocolourParticleToBufferContainer(
      particle,
      particleRenderLayer,
      baseSize * scale, baseSize * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 0.7,
      randAngle(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      colour, colour, colour
   );
   if (particleRenderLayer === ParticleRenderLayer.low) {
      lowMonocolourParticles.push(particle);
   } else {
      highMonocolourParticles.push(particle);
   }
}

const createLargeDebrisParticle = (x: number, y: number, subtileType: SubtileType): void => {
   // @Copynpaste from Layer registerSubtileUpdate function
   
   const spawnOffsetMagnitude = 8 * Math.random();
   const spawnOffsetDirection = randAngle();
   const particleX = x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   const particleY = y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
   const lifetime = randFloat(20, 30);

   let textureIndex: number;
   if (Math.random() < 0.4) {
      // Large rock
      textureIndex = 8 * 1 + 3;
   } else {
      // Small rock
      textureIndex = 8 * 1 + 2;
   }

   const moveSpeed = randFloat(20, 40);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const spinDirection = randFloat(-1, 1);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };

   const tint = subtileType === SubtileType.rockWall ? randFloat(-0.1, -0.2) : randFloat(-0.3, -0.5);
   
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      particleX, particleY,
      velocityX, velocityY,
      0, 0,
      moveSpeed * 1.5,
      randAngle(),
      1 * Math.PI * spinDirection,
      0,
      Math.abs(Math.PI * spinDirection),
      textureIndex,
      tint, tint, tint
   );
   lowTexturedParticles.push(particle);
}

export function createCollapseParticles(): void {
   for (const minedSubtile of minedSubtiles) {
      const subtileIndex = minedSubtile.subtileIndex;
      const support = minedSubtile.support;

      if (support > COLLAPSE_THRESHOLD) {
         continue;
      }
      
      let collapseLikelihood: number;
      if (minedSubtile.isCollapsing) {
         collapseLikelihood = 25;
      } else {
         collapseLikelihood = 1 - support / COLLAPSE_THRESHOLD;
         collapseLikelihood = lerp(0.3, 1, collapseLikelihood);
      }

      if (Math.random() < collapseLikelihood * 0.1 * Settings.DT_S * Math.random()) {
         const subtileX = getSubtileX(subtileIndex);
         const subtileY = getSubtileY(subtileIndex);

         const x = (subtileX + 0.5) * Settings.SUBTILE_SIZE;
         const y = (subtileY + 0.5) * Settings.SUBTILE_SIZE;

         if (Math.random() < 0.2) {
            createLargeDebrisParticle(x, y, minedSubtile.subtileType);
         } else {
            createSpeckDebris(x, y, minedSubtile.subtileType);
         }
      }
   }
}