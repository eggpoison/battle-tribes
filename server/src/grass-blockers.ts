import { Settings } from "webgl-test-shared/dist/settings";
import Board, { getChunksInBounds } from "./Board";
import { GrassBlocker, GrassBlockerCircle, GrassBlockerRectangle, blockerIsCircluar } from "webgl-test-shared/dist/grass-blockers";
import Chunk from "./Chunk";
import { StructureType } from "webgl-test-shared/dist/structures";
import Entity from "./Entity";
import { hitboxIsCircular } from "./hitboxes/hitboxes";

const enum Vars {
   // @Temporary
   GRASS_FULL_REGROW_TICKS = Settings.TPS * 10
}

const getBlockerChunks = (blocker: GrassBlocker): ReadonlyArray<Chunk> => {
   let minX: number;
   let maxX: number;
   let minY: number;
   let maxY: number;
   if (blockerIsCircluar(blocker)) {
      minX = blocker.position.x - blocker.radius;
      maxX = blocker.position.x + blocker.radius;
      minY = blocker.position.y - blocker.radius;
      maxY = blocker.position.y + blocker.radius;
   } else {
      minX = blocker.position.x - blocker.width * 0.5;
      maxX = blocker.position.x + blocker.width * 0.5;
      minY = blocker.position.y - blocker.height * 0.5;
      maxY = blocker.position.y + blocker.height * 0.5;
   }
   
   return getChunksInBounds(minX, maxX, minY, maxY);
}

const removeGrassBlocker = (blocker: GrassBlocker): void => {
   const chunks = getBlockerChunks(blocker);
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const idx = chunk.grassBlockers.indexOf(blocker);
      if (idx !== -1) {
         chunk.grassBlockers.splice(idx, 1);
      }
   }
}

export function updateGrassBlockers(): void {
   // @Incomplete: causes grass blockers to be updated multiple times
   for (let i = 0; i < Board.chunks.length; i++) {
      const chunk = Board.chunks[i];

      for (let j = 0; j < chunk.grassBlockers.length; j++) {
         const blocker = chunk.grassBlockers[j];

         blocker.blockAmount -= 1 / Vars.GRASS_FULL_REGROW_TICKS;
         if (blocker.blockAmount <= 0) {
            removeGrassBlocker(blocker);
            j--;
         }
      }
   }
}

export function addGrassBlocker(blocker: GrassBlocker): void {
   const chunks = getBlockerChunks(blocker);
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      chunk.grassBlockers.push(blocker);
   }
}

export function createStructureGrassBlockers(structure: Entity<StructureType>): void {
   for (let i = 0; i < structure.hitboxes.length; i++) {
      const hitbox = structure.hitboxes[i];

      const position = structure.position.copy();
      position.x += hitbox.offsetX;
      position.y += hitbox.offsetY;

      if (hitboxIsCircular(hitbox)) {
         const blocker: GrassBlockerCircle = {
            position: position,
            blockAmount: 1,
            radius: hitbox.radius
         };
         addGrassBlocker(blocker);
      } else {
         const blocker: GrassBlockerRectangle = {
            position: position,
            blockAmount: 1,
            width: hitbox.width,
            height: hitbox.height,
            rotation: structure.rotation + hitbox.relativeRotation
         };
         addGrassBlocker(blocker);
      }
   }
}