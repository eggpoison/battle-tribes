import { CollisionGroup, collisionGroupsCanCollide } from "battletribes-shared/collision-groups";
import { Entity } from "battletribes-shared/entities";
import { collisionBitsAreCompatible } from "battletribes-shared/hitbox-collision";
import { Settings } from "battletribes-shared/settings";
import { collide } from "./collision-resolution";
import { TransformComponentArray } from "./components/TransformComponent";
import Layer from "./Layer";
import { Hitbox } from "./hitboxes";
import { Box } from "../../shared/src/boxes/boxes";
import { CollisionResult } from "../../shared/src/collision";

export const enum CollisionVars {
   NO_COLLISION = 0xFFFF
}

type EntityCollisionPair = [affectedEntity: Entity, collidingEntity: Entity];

export interface HitboxCollisionPair {
   readonly affectedHitbox: Hitbox;
   readonly collidingHitbox: Hitbox;
   readonly collisionResult: CollisionResult;
}

export interface EntityPairCollisionInfo {
   readonly collidingEntity: Entity;
   readonly collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>;
}

/** For each affected entity, stores info about colliding entities */
export type GlobalCollisionInfo = Partial<Record<number, Array<EntityPairCollisionInfo>>>;

// Pair the colliding collision groups
const collisionGroupPairs = new Array<[pushingGroup: CollisionGroup, pushedGroup: CollisionGroup]>();
for (let pushingGroup: CollisionGroup = 0; pushingGroup < CollisionGroup._LENGTH_; pushingGroup++) {
   for (let pushedGroup: CollisionGroup = 0; pushedGroup < CollisionGroup._LENGTH_; pushedGroup++) {
      if (collisionGroupsCanCollide(pushingGroup, pushedGroup)) {
         collisionGroupPairs.push([pushingGroup, pushedGroup]);
      }
   }
}

const markEntityCollisions = (entityCollisionPairs: Array<EntityCollisionPair>, collisionInfo: GlobalCollisionInfo, affectedEntity: Entity, collidingEntity: Entity): void => {
   const affectedEntityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   
   // AABB bounding area check
   if (affectedEntityTransformComponent.boundingAreaMinX > collidingEntityTransformComponent.boundingAreaMaxX || // minX(1) > maxX(2)
       affectedEntityTransformComponent.boundingAreaMaxX < collidingEntityTransformComponent.boundingAreaMinX || // maxX(1) < minX(2)
       affectedEntityTransformComponent.boundingAreaMinY > collidingEntityTransformComponent.boundingAreaMaxY || // minY(1) > maxY(2)
       affectedEntityTransformComponent.boundingAreaMaxY < collidingEntityTransformComponent.boundingAreaMinY) { // maxY(1) < minY(2)
      return;
   }

   // Check if the collisions have already been marked
   // @Speed: perhaps modify the GlobalCollisionInfo type so we can skip if there was no collision. but see if that would actually make it faster
   if (typeof collisionInfo[affectedEntity] !== "undefined") {
      for (let i = 0; i < collisionInfo[affectedEntity]!.length; i++) {
         const pairCollisionInfo = collisionInfo[affectedEntity]![i];
         if (pairCollisionInfo.collidingEntity === collidingEntity) {
            return;
         }
      }
   }
   
   // Check hitboxes
   const collidingHitboxPairs = new Array<HitboxCollisionPair>();
   const numHitboxes = affectedEntityTransformComponent.hitboxes.length;
   const numOtherHitboxes = collidingEntityTransformComponent.hitboxes.length;
   for (let i = 0; i < numHitboxes; i++) {
      const hitbox = affectedEntityTransformComponent.hitboxes[i];
      
      const box = hitbox.box;

      for (let j = 0; j < numOtherHitboxes; j++) {
         const otherHitbox = collidingEntityTransformComponent.hitboxes[j];
         if (!collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit)) {
            continue;
         }
         
         const otherBox = otherHitbox.box;

         // If the objects are colliding, add the colliding object and this object
         const collisionResult = box.getCollisionResult(otherBox);
         if (collisionResult.isColliding) {
            collidingHitboxPairs.push({
               affectedHitbox: hitbox,
               collidingHitbox: otherHitbox,
               collisionResult: collisionResult
            });
         }
      }
   }

   if (collidingHitboxPairs.length > 0) {
      if (typeof collisionInfo[affectedEntity] === "undefined") {
         collisionInfo[affectedEntity] = [];
      }

      const pairCollisionInfo: EntityPairCollisionInfo = {
         collidingEntity: collidingEntity,
         collidingHitboxPairs: collidingHitboxPairs
      };
      collisionInfo[affectedEntity]!.push(pairCollisionInfo);

      entityCollisionPairs.push([affectedEntity, collidingEntity]);
   }
}

/**
 * @returns A number where the first 8 bits hold the index of the entity's colliding hitbox, and the next 8 bits hold the index of the other entity's colliding hitbox
*/
export function entitiesAreColliding(entity1: Entity, entity2: Entity): number {
   const transformComponent1 = TransformComponentArray.getComponent(entity1);
   const transformComponent2 = TransformComponentArray.getComponent(entity2);
   
   // AABB bounding area check
   if (transformComponent1.boundingAreaMinX > transformComponent2.boundingAreaMaxX || // minX(1) > maxX(2)
       transformComponent1.boundingAreaMaxX < transformComponent2.boundingAreaMinX || // maxX(1) < minX(2)
       transformComponent1.boundingAreaMinY > transformComponent2.boundingAreaMaxY || // minY(1) > maxY(2)
       transformComponent1.boundingAreaMaxY < transformComponent2.boundingAreaMinY) { // maxY(1) < minY(2)
      return CollisionVars.NO_COLLISION;
   }
   
   // More expensive hitbox check
   for (let i = 0; i < transformComponent1.hitboxes.length; i++) {
      const hitbox = transformComponent1.hitboxes[i];
      const box = hitbox.box;

      for (let j = 0; j < transformComponent2.hitboxes.length; j++) {
         const otherHitbox = transformComponent2.hitboxes[j];

         // If the objects are colliding, add the colliding object and this object
         if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit) && box.getCollisionResult(otherHitbox.box).isColliding) {
            return i + (j << 8);
         }
      }
   }

   return CollisionVars.NO_COLLISION;
}

export function hitboxIsCollidingWithEntity(hitbox: Hitbox, entity: Entity): boolean {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   for (const currentHitbox of transformComponent.hitboxes) {
      if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, currentHitbox.collisionMask, currentHitbox.collisionBit) && hitbox.box.getCollisionResult(currentHitbox.box).isColliding) {
         return true;
      }
   }

   return false;
}

export function resolveEntityCollisions(layer: Layer): void {
   // @Speed: For each collision group there are plenty of 'inactive chunks', where there are 0 entities of that collision
   // group. Skipping inactive chunks could provide a bit of a speedup.
   // Total of 2m chunk pair checks each second for 8 true val's - not ideal!
   // Main goal: Completely skip pair checks where both chunks are inactive.
   // Ideally we would also be able to completely skip pair checks where only 1 chunk is inactive. That would actually improve the performance for cases where even the whole board is full

   /* results from a shitty perf:
                                 v  only care about this! like 95% of pairs are useless
                    none   one   both
   surfaceLayer     23601  7942  1225
   undergroundLayer 29313  3274  181

   */
   
   // @Speed: Collision chunks literally just have an array, so why not just have them be arrays? But do the above optimisation first.
   
   const entityCollisionPairs = new Array<EntityCollisionPair>();
   const globalCollisionInfo: GlobalCollisionInfo = {};

   for (let i = 0; i < collisionGroupPairs.length; i++) {
      const pair = collisionGroupPairs[i];
      const pushingGroup = pair[0];
      const pushedGroup = pair[1];

      const pushingChunks = layer.collisionGroupChunks[pushingGroup];
      const pushedChunks = layer.collisionGroupChunks[pushedGroup];
      
      for (let chunkIdx = 0; chunkIdx < Settings.WORLD_SIZE_CHUNKS * Settings.WORLD_SIZE_CHUNKS; chunkIdx++) {
         const pushingChunk = pushingChunks[chunkIdx];
         const pushedChunk = pushedChunks[chunkIdx];

         for (let j = 0; j < pushingChunk.entities.length; j++) {
            const affectedEntity = pushingChunk.entities[j];

            for (let k = 0; k < pushedChunk.entities.length; k++) {
               const collidingEntity = pushedChunk.entities[k];

               // @Speed: This check is only needed if the pushingGroup is the pushedGroup.
               if (affectedEntity === collidingEntity) {
                  continue;
               }

               // @Speed: We re-get these components in markEntityCollisions
               const affectedEntityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
               const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

               // Make sure the entities aren't in the same carry heirarchy
               // @HACK @SPEED
               const firstAffectedEntityHitbox = affectedEntityTransformComponent.hitboxes[0];
               const firstCollidingEntityHitbox = collidingEntityTransformComponent.hitboxes[0];
               if (firstAffectedEntityHitbox.rootEntity === firstCollidingEntityHitbox.rootEntity) {
                  continue;
               }

               markEntityCollisions(entityCollisionPairs, globalCollisionInfo, affectedEntity, collidingEntity);
            }
         }
      }
   }

   for (let i = 0; i < entityCollisionPairs.length; i++) {
      const pair = entityCollisionPairs[i];
      const affectedEntity = pair[0];
      const collidingEntity = pair[1];

      // @Speed? What does this even do? awful shittery
      let collisionInfo: EntityPairCollisionInfo | undefined;
      for (let j = 0; j < globalCollisionInfo[affectedEntity]!.length; j++) {
         const currentCollisionInfo = globalCollisionInfo[affectedEntity]![j];
         if (currentCollisionInfo.collidingEntity === collidingEntity) {
            collisionInfo = currentCollisionInfo;
            break;
         }
      }
      if (typeof collisionInfo === "undefined") {
         throw new Error();
      }

      collide(affectedEntity, collidingEntity, collisionInfo.collidingHitboxPairs);
   }

   layer.globalCollisionInfo = globalCollisionInfo;
}

export function boxArraysAreColliding(boxes1: ReadonlyArray<Box>, boxes2: ReadonlyArray<Box>): boolean {
   for (const box of boxes1) {
      for (const otherBox of boxes2) {
         if (box.getCollisionResult(otherBox).isColliding) {
            return true;
         }
      }
   }
   return false;
}

export function boxHasCollisionWithBoxes(box: Box, boxes: ReadonlyArray<Box>, epsilon: number = 0): boolean {
   for (let i = 0; i < boxes.length; i++) {
      const otherBox = boxes[i];
      if (box.getCollisionResult(otherBox, epsilon).isColliding) {
         return true;
      }
   }
   return false;
}

const boxHasCollisionWithHitboxes = (box: Box, hitboxes: ReadonlyArray<Hitbox>, epsilon: number = 0): boolean => {
   for (let i = 0; i < hitboxes.length; i++) {
      const otherHitbox = hitboxes[i];

      const collisionResult = box.getCollisionResult(otherHitbox.box, epsilon);
      if (collisionResult.isColliding) {
         return true;
      }
   }
   return false;
}

export function getBoxesCollidingEntities(layer: Layer, boxes: ReadonlyArray<Box>, epsilon: number = 0): Array<Entity> {
   const collidingEntities = new Array<Entity>();
   const seenEntityIDs = new Set<number>();
   
   for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];

      let minX = box.calculateBoundsMinX();
      let maxX = box.calculateBoundsMaxX();
      let minY = box.calculateBoundsMinY();
      let maxY = box.calculateBoundsMaxY();
      if (minX < 0) {
         minX = 0;
      }
      if (maxX >= Settings.WORLD_UNITS) {
         maxX = Settings.WORLD_UNITS - 1;
      }
      if (minY < 0) {
         minY = 0;
      }
      if (maxY >= Settings.WORLD_UNITS) {
         maxY = Settings.WORLD_UNITS - 1;
      }
      
      const minChunkX = Math.max(Math.floor(minX / Settings.CHUNK_UNITS), 0);
      const maxChunkX = Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
      const minChunkY = Math.max(Math.floor(minY / Settings.CHUNK_UNITS), 0);
      const maxChunkY = Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            for (let i = 0; i < chunk.entities.length; i++) {
               const entity = chunk.entities[i];
               if (seenEntityIDs.has(entity)) {
                  continue;
               }

               seenEntityIDs.add(entity);
               
               const entityTransformComponent = TransformComponentArray.getComponent(entity);
               if (boxHasCollisionWithHitboxes(box, entityTransformComponent.hitboxes, epsilon)) {
                  collidingEntities.push(entity);
               }
            }
         }
      }
   }

   return collidingEntities;
}

// @Copynpaste
export function getHitboxesCollidingEntities(layer: Layer, hitboxes: ReadonlyArray<Hitbox>, epsilon: number = 0): Array<Entity> {
   const collidingEntities = new Array<Entity>();
   const seenEntityIDs = new Set<number>();
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      const box = hitbox.box;

      let minX = box.calculateBoundsMinX();
      let maxX = box.calculateBoundsMaxX();
      let minY = box.calculateBoundsMinY();
      let maxY = box.calculateBoundsMaxY();
      if (minX < 0) {
         minX = 0;
      }
      if (maxX >= Settings.WORLD_UNITS) {
         maxX = Settings.WORLD_UNITS - 1;
      }
      if (minY < 0) {
         minY = 0;
      }
      if (maxY >= Settings.WORLD_UNITS) {
         maxY = Settings.WORLD_UNITS - 1;
      }
      
      const minChunkX = Math.max(Math.floor(minX / Settings.CHUNK_UNITS), 0);
      const maxChunkX = Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
      const minChunkY = Math.max(Math.floor(minY / Settings.CHUNK_UNITS), 0);
      const maxChunkY = Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            for (let i = 0; i < chunk.entities.length; i++) {
               const entity = chunk.entities[i];
               if (seenEntityIDs.has(entity)) {
                  continue;
               }

               seenEntityIDs.add(entity);
               
               const entityTransformComponent = TransformComponentArray.getComponent(entity);
               if (boxHasCollisionWithHitboxes(box, entityTransformComponent.hitboxes, epsilon)) {
                  collidingEntities.push(entity);
               }
            }
         }
      }
   }

   return collidingEntities;
}