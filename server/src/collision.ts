import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, angle, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import Entity from "./Entity";
import CircularHitbox from "./hitboxes/CircularHitbox";
import RectangularHitbox, { assertIsRectangular } from "./hitboxes/RectangularHitbox";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { onFrozenYetiCollision } from "./entities/mobs/frozen-yeti";
import { onGolemCollision } from "./entities/mobs/golem";
import { onPebblumCollision } from "./entities/mobs/pebblum";
import { onSlimeCollision } from "./entities/mobs/slime";
import { onYetiCollision } from "./entities/mobs/yeti";
import { onZombieCollision } from "./entities/mobs/zombie";
import { onBattleaxeProjectileCollision } from "./entities/projectiles/battleaxe-projectile";
import { onIceArrowCollision } from "./entities/projectiles/ice-arrow";
import { onIceShardCollision } from "./entities/projectiles/ice-shard";
import { onRockSpikeProjectileCollision } from "./entities/projectiles/rock-spike";
import { onSlimeSpitCollision } from "./entities/projectiles/slime-spit";
import { onSpearProjectileCollision } from "./entities/projectiles/spear-projectile";
import { onSpitPoisonCollision } from "./entities/projectiles/spit-poison";
import { onWoodenArrowCollision } from "./entities/projectiles/wooden-arrow";
import { onCactusCollision } from "./entities/resources/cactus";
import { onIceSpikesCollision } from "./entities/resources/ice-spikes";
import { onSnowballCollision } from "./entities/snowball";
import { onPunjiSticksCollision } from "./entities/structures/punji-sticks";
import { onSpikesCollision } from "./entities/structures/spikes";
import { onPlayerCollision } from "./entities/tribes/player";
import { onEmbrasureCollision } from "./entities/structures/embrasure";
import Board from "./Board";
import { onTribesmanCollision } from "./entities/tribes/tribe-member";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit, rectanglesAreColliding } from "webgl-test-shared/dist/collision";
import { Hitbox, hitboxIsCircular } from "./hitboxes/hitboxes";

interface CollisionPushInfo {
   direction: number;
   amountIn: number;
}

export const enum CollisionVars {
   NO_COLLISION = 0xFFFF
}

const getCircleCircleCollisionPushInfo = (pushedHitbox: CircularHitbox, pushingHitbox: CircularHitbox): CollisionPushInfo => {
   const dist = Math.sqrt(Math.pow(pushedHitbox.position.x - pushingHitbox.position.x, 2) + Math.pow(pushedHitbox.position.y - pushingHitbox.position.y, 2));
   
   return {
      amountIn: pushedHitbox.radius + pushingHitbox.radius - dist,
      // Angle from pushing hitbox to pushed hitbox
      direction: angle(pushedHitbox.position.x - pushingHitbox.position.x, pushedHitbox.position.y - pushingHitbox.position.y)
   };
}

const getCircleRectCollisionPushInfo = (pushedHitbox: CircularHitbox, pushingHitbox: RectangularHitbox): CollisionPushInfo => {
   const rectRotation = pushingHitbox.rotation;

   const circlePosX = rotateXAroundPoint(pushedHitbox.position.x, pushedHitbox.position.y, pushingHitbox.position.x, pushingHitbox.position.y, -rectRotation);
   const circlePosY = rotateYAroundPoint(pushedHitbox.position.x, pushedHitbox.position.y, pushingHitbox.position.x, pushingHitbox.position.y, -rectRotation);
   
   const distanceX = circlePosX - pushingHitbox.position.x;
   const distanceY = circlePosY - pushingHitbox.position.y;

   const absDistanceX = Math.abs(distanceX);
   const absDistanceY = Math.abs(distanceY);

   // Top and bottom collisions
   if (absDistanceX <= (pushingHitbox.width/2)) {
      return {
         amountIn: pushingHitbox.height/2 + pushedHitbox.radius - absDistanceY,
         direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
      };
   }

   // Left and right collisions
   if (absDistanceY <= (pushingHitbox.height/2)) {
      return {
         amountIn: pushingHitbox.width/2 + pushedHitbox.radius - absDistanceX,
         direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
      };
   }

   const cornerDistanceSquared = Math.pow(absDistanceX - pushingHitbox.width/2, 2) + Math.pow(absDistanceY - pushingHitbox.height/2, 2);
   if (cornerDistanceSquared <= pushedHitbox.radius * pushedHitbox.radius) {
      // @Cleanup: Whole lot of copy and paste
      const amountInX = absDistanceX - pushingHitbox.width/2 - pushedHitbox.radius;
      const amountInY = absDistanceY - pushingHitbox.height/2 - pushedHitbox.radius;
      if (Math.abs(amountInY) < Math.abs(amountInX)) {
         const closestRectBorderY = circlePosY < pushingHitbox.position.y ? pushingHitbox.position.y - pushingHitbox.height/2 : pushingHitbox.position.y + pushingHitbox.height/2;
         const closestRectBorderX = circlePosX < pushingHitbox.position.x ? pushingHitbox.position.x - pushingHitbox.width/2 : pushingHitbox.position.x + pushingHitbox.width/2;
         const xDistanceFromRectBorder = Math.abs(closestRectBorderX - circlePosX);
         const len = Math.sqrt(pushedHitbox.radius * pushedHitbox.radius - xDistanceFromRectBorder * xDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderY - (circlePosY - len * Math.sign(distanceY))),
            direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
         };
      } else {
         const closestRectBorderX = circlePosX < pushingHitbox.position.x ? pushingHitbox.position.x - pushingHitbox.width/2 : pushingHitbox.position.x + pushingHitbox.width/2;
         
         const closestRectBorderY = circlePosY < pushingHitbox.position.y ? pushingHitbox.position.y - pushingHitbox.height/2 : pushingHitbox.position.y + pushingHitbox.height/2;
         const yDistanceFromRectBorder = Math.abs(closestRectBorderY - circlePosY);
         const len = Math.sqrt(pushedHitbox.radius * pushedHitbox.radius - yDistanceFromRectBorder * yDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderX - (circlePosX - len * Math.sign(distanceX))),
            direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
         };
      }
   }

   // @Incomplete
   // console.warn("Couldn't find the collision");
   return {
      amountIn: 0,
      direction: 0
   };
}

const getCollisionPushInfo = (pushedHitbox: Hitbox, pushingHitbox: Hitbox): CollisionPushInfo => {
   if (hitboxIsCircular(pushedHitbox) && hitboxIsCircular(pushingHitbox)) {
      // Circle + Circle
      return getCircleCircleCollisionPushInfo(pushedHitbox, pushingHitbox);
   } else if (hitboxIsCircular(pushedHitbox) && !hitboxIsCircular(pushingHitbox)) {
      // Circle + Rectangle
      return getCircleRectCollisionPushInfo(pushedHitbox, pushingHitbox);
   } else if (!hitboxIsCircular(pushedHitbox) && hitboxIsCircular(pushingHitbox)) {
      // Rectangle + Circle
      const pushInfo = getCircleRectCollisionPushInfo(pushingHitbox, pushedHitbox);
      pushInfo.direction += Math.PI;
      return pushInfo;
   } else {
      // Rectangle + Rectangle
      
      assertIsRectangular(pushedHitbox);
      assertIsRectangular(pushingHitbox);
      
      // @Cleanup: copy and paste
      const collisionData = rectanglesAreColliding(pushedHitbox.vertexOffsets, pushingHitbox.vertexOffsets, pushedHitbox.position, pushingHitbox.position, pushedHitbox.axisX, pushedHitbox.axisY, pushingHitbox.axisX, pushingHitbox.axisY);
      if (!collisionData.isColliding) {
         throw new Error();
      }
      
      return {
         amountIn: collisionData.overlap,
         // @Hack
         direction: angle(collisionData.axisX, collisionData.axisY)
      }
   }
}

export function hitboxesAreColliding(hitbox: Hitbox, hitboxes: ReadonlyArray<Hitbox>): boolean {
   for (let j = 0; j < hitboxes.length; j++) {
      const otherHitbox = hitboxes[j];

      // If the objects are colliding, add the colliding object and this object
      if (hitbox.isColliding(otherHitbox)) {
         return true;
      }
   }

   // If no hitboxes match, then they aren't colliding
   return false;
}

const collisionBitsAreCompatible = (collisionMask1: number, collisionBit1: number, collisionMask2: number, collisionBit2: number): boolean => {
   return (collisionMask1 & collisionBit2) !== 0 && (collisionMask2 & collisionBit1) !== 0;
}

/**
 * @returns A number where the first 8 bits hold the index of the entity's colliding hitbox, and the next 8 bits hold the index of the other entity's colliding hitbox
*/
export function entitiesAreColliding(entity1: Entity, entity2: Entity): number {
   // AABB bounding area check
   if (entity1.boundingAreaMinX > entity2.boundingAreaMaxX || // minX(1) > maxX(2)
       entity1.boundingAreaMaxX < entity2.boundingAreaMinX || // maxX(1) < minX(2)
       entity1.boundingAreaMinY > entity2.boundingAreaMaxY || // minY(1) > maxY(2)
       entity1.boundingAreaMaxY < entity2.boundingAreaMinY) { // maxY(1) < minY(2)
      return CollisionVars.NO_COLLISION;
   }
   
   // More expensive hitbox check
   const numHitboxes = entity1.hitboxes.length;
   const numOtherHitboxes = entity2.hitboxes.length;
   for (let i = 0; i < numHitboxes; i++) {
      const hitbox = entity1.hitboxes[i];

      for (let j = 0; j < numOtherHitboxes; j++) {
         const otherHitbox = entity2.hitboxes[j];

         // If the objects are colliding, add the colliding object and this object
         if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit) && hitbox.isColliding(otherHitbox)) {
            return i + (j << 8);
         }
      }
   }

   // If no hitboxes match, then they aren't colliding
   return CollisionVars.NO_COLLISION;
}

const resolveHardCollision = (entity: Entity, pushInfo: CollisionPushInfo): void => {
   // Transform the entity out of the hitbox
   entity.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   entity.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   const physicsComponent = PhysicsComponentArray.getComponent(entity.id);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const projectionCoeff = physicsComponent.velocity.x * bx + physicsComponent.velocity.y * by;
   physicsComponent.velocity.x = bx * projectionCoeff;
   physicsComponent.velocity.y = by * projectionCoeff;
}

const resolveSoftCollision = (entity: Entity, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   // Force gets greater the further into each other the entities are
   const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
   const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / entity.totalMass;

   const physicsComponent = PhysicsComponentArray.getComponent(entity.id);
   
   physicsComponent.velocity.x += pushForce * Math.sin(pushInfo.direction);
   physicsComponent.velocity.y += pushForce * Math.cos(pushInfo.direction);
}

export function collide(entity: Entity, pushingEntity: Entity, pushedHitboxIdx: number, pushingHitboxIdx: number): void {
   const pushedHitbox = entity.hitboxes[pushedHitboxIdx];
   const pushingHitbox = pushingEntity.hitboxes[pushingHitboxIdx];
   
   const pushInfo = getCollisionPushInfo(pushedHitbox, pushingHitbox);

   // @Hack
   const collisionPoint = new Point((entity.position.x + pushingEntity.position.x) / 2, (entity.position.y + pushingEntity.position.y) / 2);

   if (collisionBitsAreCompatible(entity.collisionMask, entity.collisionBit, pushingEntity.collisionMask, pushingEntity.collisionBit) && PhysicsComponentArray.hasComponent(entity.id)) {
      const physicsComponent = PhysicsComponentArray.getComponent(entity.id);
      if (!physicsComponent.isImmovable) {
         if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
            resolveHardCollision(entity, pushInfo);
         } else {
            resolveSoftCollision(entity, pushingHitbox, pushInfo);
         }

         // @Cleanup: Should we just clean it immediately here?
         physicsComponent.positionIsDirty = true;
      }

      // @Hack
      switch (entity.type) {
         case EntityType.iceShardProjectile: onIceShardCollision(entity, pushingEntity, collisionPoint); break;
      }
   }

   switch (entity.type) {
      case EntityType.player: onPlayerCollision(entity, pushingEntity); break;
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: onTribesmanCollision(entity.id, pushingEntity); break;
      case EntityType.iceSpikes: onIceSpikesCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.cactus: onCactusCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.zombie: onZombieCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.slime: onSlimeCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.woodenArrowProjectile: onWoodenArrowCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.yeti: onYetiCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.snowball: onSnowballCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.frozenYeti: onFrozenYetiCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.rockSpikeProjectile: onRockSpikeProjectileCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.spearProjectile: onSpearProjectileCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.slimeSpit: onSlimeSpitCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.spitPoison: onSpitPoisonCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.battleaxeProjectile: onBattleaxeProjectileCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.iceArrow: onIceArrowCollision(entity, pushingEntity); break;
      case EntityType.pebblum: onPebblumCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.golem: onGolemCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.floorSpikes:
      case EntityType.wallSpikes: onSpikesCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks: onPunjiSticksCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.embrasure: onEmbrasureCollision(pushingEntity, pushedHitboxIdx); break;
   }
}

export function getHitboxesCollidingEntities(hitboxes: ReadonlyArray<Hitbox>): ReadonlyArray<Entity> {
   const collidingEntities = new Array<Entity>();
   const seenEntityIDs = new Set<number>();
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];

      let minX = hitbox.calculateHitboxBoundsMinX();
      let maxX = hitbox.calculateHitboxBoundsMaxX();
      let minY = hitbox.calculateHitboxBoundsMinY();
      let maxY = hitbox.calculateHitboxBoundsMaxY();
      if (minX < 0) {
         minX = 0;
      }
      if (maxX >= Settings.BOARD_UNITS) {
         maxX = Settings.BOARD_UNITS - 1;
      }
      if (minY < 0) {
         minY = 0;
      }
      if (maxY >= Settings.BOARD_UNITS) {
         maxY = Settings.BOARD_UNITS - 1;
      }
      
      const minChunkX = Math.max(Math.floor(minX / Settings.CHUNK_UNITS), 0);
      const maxChunkX = Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
      const minChunkY = Math.max(Math.floor(minY / Settings.CHUNK_UNITS), 0);
      const maxChunkY = Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Board.getChunk(chunkX, chunkY);
            for (let j = 0; j < chunk.entities.length; j++) {
               const entity = chunk.entities[j];
               if (seenEntityIDs.has(entity.id)) {
                  continue;
               }
               seenEntityIDs.add(entity.id);
               
               if (hitboxesAreColliding(hitbox, entity.hitboxes)) {
                  collidingEntities.push(entity);
               }
            }
         }
      }
   }

   return collidingEntities;
}

/** If no collision is found, does nothing. */
export function resolveEntityTileCollision(entity: Entity, hitbox: Hitbox, tileX: number, tileY: number): void {
   // @Speed
   const tilePos = new Point((tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE);
   const tileHitbox = new RectangularHitbox(tilePos, 1, 0, 0, HitboxCollisionType.hard, 1, 0, Settings.TILE_SIZE, Settings.TILE_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   
   if (hitbox.isColliding(tileHitbox)) {
      const pushInfo = getCollisionPushInfo(hitbox, tileHitbox);
      resolveHardCollision(entity, pushInfo);
   }
}