import { CollisionGroup, collisionGroupsCanCollide } from "../../shared/src/collision-groups";
import { EntityID, EntityType, EntityTypeString } from "../../shared/src/entities";
import { collisionBitsAreCompatible } from "../../shared/src/hitbox-collision";
import { Settings } from "../../shared/src/settings";
import { collide } from "./collision";
import { TransformComponentArray } from "./components/TransformComponent";
import Layer from "./Layer";
import { getEntityType } from "./world";

type EntityCollisionPair = [pushingEntity: EntityID, pushedEntity: EntityID];
export type HitboxCollisionPair = [pushingHitboxIdx: number, pushedHitboxIdx: number];

export interface EntityPairCollisionInfo {
   readonly pushedEntity: EntityID;
   readonly collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>;
}

/** For each pushing entity, stores info about pushed entities */
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

const markEntityCollisions = (entityCollisionPairs: Array<EntityCollisionPair>, collisionInfo: GlobalCollisionInfo, pushingEntity: EntityID, pushedEntity: EntityID): void => {
   const pushingEntityTransformComponent = TransformComponentArray.getComponent(pushingEntity);
   const pushedEntityTransformComponent = TransformComponentArray.getComponent(pushedEntity);
   
   // AABB bounding area check
   if (pushingEntityTransformComponent.boundingAreaMinX > pushedEntityTransformComponent.boundingAreaMaxX || // minX(1) > maxX(2)
       pushingEntityTransformComponent.boundingAreaMaxX < pushedEntityTransformComponent.boundingAreaMinX || // maxX(1) < minX(2)
       pushingEntityTransformComponent.boundingAreaMinY > pushedEntityTransformComponent.boundingAreaMaxY || // minY(1) > maxY(2)
       pushingEntityTransformComponent.boundingAreaMaxY < pushedEntityTransformComponent.boundingAreaMinY) { // maxY(1) < minY(2)
      return;
   }

   // Check if the collisions have already been marked
   // @Speed: perhaps modify the GlobalCollisionInfo type so we can skip if there was no collision. but see if that would actually make it faster
   if (typeof collisionInfo[pushingEntity] !== "undefined") {
      for (let i = 0; i < collisionInfo[pushingEntity]!.length; i++) {
         const pairCollisionInfo = collisionInfo[pushingEntity]![i];
         if (pairCollisionInfo.pushedEntity === pushedEntity) {
            return;
         }
      }
   }
   
   // Check hitboxes
   const collidingHitboxPairs = new Array<HitboxCollisionPair>();
   const numHitboxes = pushingEntityTransformComponent.hitboxes.length;
   const numOtherHitboxes = pushedEntityTransformComponent.hitboxes.length;
   for (let i = 0; i < numHitboxes; i++) {
      const hitbox = pushingEntityTransformComponent.hitboxes[i];
      const box = hitbox.box;

      for (let j = 0; j < numOtherHitboxes; j++) {
         const otherHitbox = pushedEntityTransformComponent.hitboxes[j];
         const otherBox = otherHitbox.box;

         // If the objects are colliding, add the colliding object and this object
         if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit) && box.isColliding(otherBox)) {
            // Check for existing collision info
            collidingHitboxPairs.push([i, j]);
         }
      }
   }

   if (collidingHitboxPairs.length > 0) {
      if (typeof collisionInfo[pushingEntity] === "undefined") {
         collisionInfo[pushingEntity] = [];
      }

      const pairCollisionInfo: EntityPairCollisionInfo = {
         pushedEntity: pushedEntity,
         collidingHitboxPairs: collidingHitboxPairs
      };
      collisionInfo[pushingEntity]!.push(pairCollisionInfo);

      entityCollisionPairs.push([pushingEntity, pushedEntity]);
   }
}

export function resolveEntityCollisions(layer: Layer): void {
   const entityCollisionPairs = new Array<EntityCollisionPair>();
   const globalCollisionInfo: GlobalCollisionInfo = {};

   for (let i = 0; i < collisionGroupPairs.length; i++) {
      const pair = collisionGroupPairs[i];
      const pushingGroup = pair[0];
      const pushedGroup = pair[1];

      const pushingChunks = layer.collisionGroupChunks[pushingGroup];
      const pushedChunks = layer.collisionGroupChunks[pushedGroup];
      
      for (let chunkIdx = 0; chunkIdx < Settings.BOARD_SIZE * Settings.BOARD_SIZE; chunkIdx++) {
         const pushingChunk = pushingChunks[chunkIdx];
         const pushedChunk = pushedChunks[chunkIdx];

         for (let j = 0; j < pushingChunk.entities.length; j++) {
            const pushingEntity = pushingChunk.entities[j];

            for (let k = 0; k < pushedChunk.entities.length; k++) {
               const pushedEntity = pushedChunk.entities[k];

               // @Speed: This check is only needed if the pushingGroup is the pushedGroup.
               if (pushingEntity === pushedEntity) {
                  continue;
               }

               markEntityCollisions(entityCollisionPairs, globalCollisionInfo, pushingEntity, pushedEntity);
            }
         }
      }
   }

   for (let i = 0; i < entityCollisionPairs.length; i++) {
      const pair = entityCollisionPairs[i];
      const pushingEntity = pair[0];
      const pushedEntity = pair[1];

      let collisionInfo: EntityPairCollisionInfo | undefined;
      for (let j = 0; j < globalCollisionInfo[pushingEntity]!.length; j++) {
         const currentCollisionInfo = globalCollisionInfo[pushingEntity]![j];
         if (currentCollisionInfo.pushedEntity === pushedEntity) {
            collisionInfo = currentCollisionInfo;
            break;
         }
      }
      if (typeof collisionInfo === "undefined") {
         throw new Error();
      }

      collide(pushedEntity, pushingEntity, collisionInfo.collidingHitboxPairs);
   }

   layer.globalCollisionInfo = globalCollisionInfo;
}