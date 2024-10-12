import { Settings } from "battletribes-shared/settings";
import Entity from "./Entity";
import { ServerComponentType } from "battletribes-shared/components";
import { collisionBitsAreCompatible, CollisionPushInfo, getCollisionPushInfo } from "battletribes-shared/hitbox-collision";
import { Point } from "battletribes-shared/utils";
import { HitboxCollisionType, Hitbox, updateBox } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { EntityID } from "battletribes-shared/entities";
import { TransformComponentArray } from "./entity-components/TransformComponent";
import Chunk from "./Chunk";
import Player from "./entities/Player";
import { PhysicsComponentArray } from "./entity-components/PhysicsComponent";
import { getEntityLayer } from "./world";
import Layer from "./Layer";
import { getComponentArrays } from "./entity-components/ComponentArray";

interface EntityPairCollisionInfo {
   readonly minEntityInvolvedHitboxes: Array<Hitbox>;
   readonly maxEntityInvolvedHitboxes: Array<Hitbox>;
}

type CollisionPairs = Record<number, Record<number, EntityPairCollisionInfo | null>>;

// @Cleanup @Incomplete
// const entity1 = Board.entityRecord[entity1ID]!;
// const entity2 = Board.entityRecord[entity2ID]!;
// collide(entity1, entity2, hitbox, otherHitbox);
// collide(entity2, entity1, otherHitbox, hitbox);
// } else {
//    // @Hack
//    if (otherTransformComponent.collisionBit === COLLISION_BITS.plants) {
//       latencyGameState.lastPlantCollisionTicks = Board.serverTicks;
//    }
//    break;
// }

const resolveHardCollision = (entity: EntityID, pushInfo: CollisionPushInfo): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // Transform the entity out of the hitbox
   transformComponent.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   transformComponent.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const selfVelocityProjectionCoeff = physicsComponent.selfVelocity.x * bx + physicsComponent.selfVelocity.y * by;
   physicsComponent.selfVelocity.x = bx * selfVelocityProjectionCoeff;
   physicsComponent.selfVelocity.y = by * selfVelocityProjectionCoeff;
   const externalVelocityProjectionCoeff = physicsComponent.externalVelocity.x * bx + physicsComponent.externalVelocity.y * by;
   physicsComponent.externalVelocity.x = bx * externalVelocityProjectionCoeff;
   physicsComponent.externalVelocity.y = by * externalVelocityProjectionCoeff;
}

const resolveSoftCollision = (entity: EntityID, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.totalMass !== 0) {
      const physicsComponent = PhysicsComponentArray.getComponent(entity);
      
      // Force gets greater the further into each other the entities are
      const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
      const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / transformComponent.totalMass;
      
      physicsComponent.externalVelocity.x += pushForce * Math.sin(pushInfo.direction);
      physicsComponent.externalVelocity.y += pushForce * Math.cos(pushInfo.direction);
   }
}

export function collide(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox, isPushed: boolean): void {
   if (isPushed && PhysicsComponentArray.hasComponent(entity)) {
      const pushInfo = getCollisionPushInfo(pushedHitbox.box, pushingHitbox.box);
      if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
         resolveHardCollision(entity, pushInfo);
      } else {
         resolveSoftCollision(entity, pushingHitbox, pushInfo);
      }
   }

   // @Speed
   const componentArrays = getComponentArrays();
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (componentArray.hasComponent(entity)) {
         const component = componentArray.getComponent(entity);
         if (typeof component.onCollision !== "undefined") {
            component.onCollision(collidingEntity, pushedHitbox, pushingHitbox);
         }
      }
   }
}

const getEntityPairCollisionInfo = (entity1: EntityID, entity2: EntityID): EntityPairCollisionInfo | null => {
   const transformComponent1 = TransformComponentArray.getComponent(entity1);
   const transformComponent2 = TransformComponentArray.getComponent(entity2);
   
   // AABB bounding area check
   if (transformComponent1.boundingAreaMinX > transformComponent2.boundingAreaMaxX || // minX(1) > maxX(2)
       transformComponent1.boundingAreaMaxX < transformComponent2.boundingAreaMinX || // maxX(1) < minX(2)
       transformComponent1.boundingAreaMinY > transformComponent2.boundingAreaMaxY || // minY(1) > maxY(2)
       transformComponent1.boundingAreaMaxY < transformComponent2.boundingAreaMinY) { // maxY(1) < minY(2)
      return null;
   }

   const entity1InvolvedHitboxes = new Array<Hitbox>();
   const entity2InvolvedHitboxes = new Array<Hitbox>();
   
   // More expensive hitbox check
   const numHitboxes = transformComponent1.hitboxes.length;
   const numOtherHitboxes = transformComponent2.hitboxes.length;
   for (let i = 0; i < numHitboxes; i++) {
      const hitbox = transformComponent1.hitboxes[i];
      const box = hitbox.box;

      for (let j = 0; j < numOtherHitboxes; j++) {
         const otherHitbox = transformComponent2.hitboxes[j];
         const otherBox = otherHitbox.box;

         // If the objects are colliding, add the colliding object and this object
         if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit) && box.isColliding(otherBox)) {
            entity1InvolvedHitboxes.push(hitbox);
            entity2InvolvedHitboxes.push(otherHitbox);
         }
      }
   }

   if (entity1InvolvedHitboxes.length > 0) {
      return {
         minEntityInvolvedHitboxes: entity1 < entity2 ? entity1InvolvedHitboxes : entity2InvolvedHitboxes,
         maxEntityInvolvedHitboxes: entity1 < entity2 ? entity2InvolvedHitboxes : entity1InvolvedHitboxes
      };
   }
   return null;
}

const entityCollisionPairHasAlreadyBeenChecked = (collisionPairs: CollisionPairs, minEntity: EntityID, maxEntity: EntityID): boolean => {
   return typeof collisionPairs[minEntity] !== "undefined" && typeof collisionPairs[minEntity][maxEntity] !== "undefined";
}

const collectEntityCollisionsWithChunk = (collisionPairs: CollisionPairs, entity1: EntityID, chunk: Chunk): void => {
   for (let k = 0; k < chunk.entities.length; k++) {
      const entity2 = chunk.entities[k];
      // @Speed
      if (entity1 === entity2) {
         continue;
      }

      let minID: number;
      let maxID: number;
      if (entity1 > entity2) {
         minID = entity2;
         maxID = entity1;
      } else {
         minID = entity1;
         maxID = entity2;
      }
      if (entityCollisionPairHasAlreadyBeenChecked(collisionPairs, minID, maxID)) {
         continue;
      }

      const collisionInfo = getEntityPairCollisionInfo(entity1, entity2);
      if (collisionInfo !== null) {
         if (typeof collisionPairs[minID] === "undefined") {
            collisionPairs[minID] = {};
         }
         collisionPairs[minID][maxID] = collisionInfo;
      }
   }
}

const resolveCollisionPairs = (collisionPairs: CollisionPairs, onlyResolvePlayerCollisions: boolean): void => {
   // @Speed @Garbage
   for (const entity1 of Object.keys(collisionPairs).map(Number)) {
      for (const entity2 of Object.keys(collisionPairs[entity1]).map(Number)) {
         const collisionInfo = collisionPairs[entity1][entity2];
         if (collisionInfo === null) {
            continue;
         }

         // Note: from here, entity1 < entity2 (by definition)

         for (let i = 0; i < collisionInfo.minEntityInvolvedHitboxes.length; i++) {
            const entity1Hitbox = collisionInfo.minEntityInvolvedHitboxes[i];
            const entity2Hitbox = collisionInfo.maxEntityInvolvedHitboxes[i];

            collide(entity1, entity2, entity1Hitbox, entity2Hitbox, !onlyResolvePlayerCollisions || entity1 === Player.instance!.id);
            collide(entity2, entity1, entity2Hitbox, entity1Hitbox, !onlyResolvePlayerCollisions || entity2 === Player.instance!.id);
         }
      }
   }
}

export function resolveEntityCollisions(layer: Layer): void {
   const collisionPairs: CollisionPairs = {};
   
   const numChunks = Settings.BOARD_SIZE * Settings.BOARD_SIZE;
   for (let i = 0; i < numChunks; i++) {
      const chunk = layer.chunks[i];

      // @Bug: collision can happen multiple times
      // @Speed: physics-physics comparisons happen twice
      // For all physics entities, check for collisions with all other entities in the chunk
      for (let j = 0; j < chunk.physicsEntities.length; j++) {
         const entity1ID = chunk.physicsEntities[j];
         
         collectEntityCollisionsWithChunk(collisionPairs, entity1ID, chunk);
      }
   }

   resolveCollisionPairs(collisionPairs, false);
}

export function resolvePlayerCollisions(): void {
   const collisionPairs: CollisionPairs = {};

   const player = Player.instance!;
   const transformComponent = TransformComponentArray.getComponent(player.id);

   for (const chunk of transformComponent.chunks) {
      collectEntityCollisionsWithChunk(collisionPairs, Player.instance!.id, chunk);
   }

   resolveCollisionPairs(collisionPairs, true);
}

export function resolveWallCollisions(entity: EntityID): void {
   const layer = getEntityLayer(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      const box = hitbox.box;
      
      const boundsMinX = transformComponent.position.x - 32;
      const boundsMaxX = transformComponent.position.x + 32;
      const boundsMinY = transformComponent.position.y - 32;
      const boundsMaxY = transformComponent.position.y + 32;
      
      // @Hack: use actual bounding area
      const minSubtileX = Math.max(Math.floor(boundsMinX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileX = Math.min(Math.floor(boundsMaxX / Settings.SUBTILE_SIZE), (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
      const minSubtileY = Math.max(Math.floor(boundsMinY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileY = Math.min(Math.floor(boundsMaxY / Settings.SUBTILE_SIZE), (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   
      // @Incomplete
      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            if (!layer.subtileIsWall(subtileX, subtileY)) {
               continue;
            }

            // Check if the tile is colliding
            const tileCenterX = (subtileX + 0.5) * Settings.SUBTILE_SIZE;
            const tileCenterY = (subtileY + 0.5) * Settings.SUBTILE_SIZE;

            const tileBox = new RectangularBox(new Point(0, 0), Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE, 0);
            updateBox(tileBox, tileCenterX, tileCenterY, 0);

            if (box.isColliding(tileBox)) {
               const pushInfo = getCollisionPushInfo(box, tileBox);
               resolveHardCollision(entity, pushInfo);
            }
         }
      }
   }
}