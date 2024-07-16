import { Settings } from "webgl-test-shared/dist/settings";
import Board, { getChunksInBounds } from "./Board";
import { GrassBlocker, GrassBlockerCircle, GrassBlockerRectangle, blockerIsCircluar } from "webgl-test-shared/dist/grass-blockers";
import Chunk from "./Chunk";
import { HitboxFlags, hitboxIsCircular } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./components/TransformComponent";

const blockers = new Array<GrassBlocker>();
const blockerAssociatedEntities = new Array<EntityID>();

const enum Vars {
   GRASS_FULL_REGROW_TICKS = Settings.TPS * 60,
   GRASS_FULL_DIE_TICKS = Settings.TPS * 20,
   BLOCKER_PADDING = -4
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

export function addGrassBlocker(blocker: GrassBlocker, associatedEntityID: number): void {
   const chunks = getBlockerChunks(blocker);
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      chunk.grassBlockers.push(blocker);
   }

   blockers.push(blocker);
   blockerAssociatedEntities.push(associatedEntityID);
}

const removeGrassBlocker = (blocker: GrassBlocker, i: number): void => {
   const chunks = getBlockerChunks(blocker);
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const idx = chunk.grassBlockers.indexOf(blocker);
      if (idx !== -1) {
         chunk.grassBlockers.splice(idx, 1);
      }
   }

   // @Speed: swap with last instead
   blockers.splice(i, 1);
   blockerAssociatedEntities.splice(i, 1);
}

export function updateGrassBlockers(): void {
   for (let i = 0; i < blockers.length; i++) {
      const blocker = blockers[i];
      
      const associatedEntity = blockerAssociatedEntities[i];
      if (Board.hasEntity(associatedEntity)) {
         blocker.blockAmount += 1 / Vars.GRASS_FULL_DIE_TICKS;
         if (blocker.blockAmount > blocker.maxBlockAmount) {
            blocker.blockAmount = blocker.maxBlockAmount;
         }
      } else {
         blocker.blockAmount -= 1 / Vars.GRASS_FULL_REGROW_TICKS;
         if (blocker.blockAmount <= 0) {
            removeGrassBlocker(blocker, i);
            i--;
         }
      }
   }
}

export function createStructureGrassBlockers(structure: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(structure);
   
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];

      if ((hitbox.flags & HitboxFlags.NON_GRASS_BLOCKING) !== 0) {
         continue;
      }

      const position = transformComponent.position.copy();
      position.x += hitbox.offset.x;
      position.y += hitbox.offset.y;

      if (hitboxIsCircular(hitbox)) {
         const blocker: GrassBlockerCircle = {
            position: position,
            blockAmount: 0,
            radius: hitbox.radius + Vars.BLOCKER_PADDING,
            maxBlockAmount: 1
         };
         addGrassBlocker(blocker, structure);
      } else {
         const blocker: GrassBlockerRectangle = {
            position: position,
            blockAmount: 0,
            width: hitbox.width + Vars.BLOCKER_PADDING * 2,
            height: hitbox.height + Vars.BLOCKER_PADDING * 2,
            rotation: transformComponent.rotation + hitbox.relativeRotation,
            maxBlockAmount: 1
         };
         addGrassBlocker(blocker, structure);
      }
   }
}