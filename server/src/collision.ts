import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import { PhysicsComponent, PhysicsComponentArray } from "./components/PhysicsComponent";
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
import { onCactusCollision } from "./entities/resources/cactus";
import { onIceSpikesCollision } from "./entities/resources/ice-spikes";
import { onSnowballCollision } from "./entities/snowball";
import { onPunjiSticksCollision } from "./entities/structures/punji-sticks";
import { onSpikesCollision } from "./entities/structures/spikes";
import { onPlayerCollision } from "./entities/tribes/player";
import { onEmbrasureCollision } from "./entities/structures/embrasure";
import { onTribesmanCollision } from "./entities/tribes/tribe-member";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { RectangularHitbox, Hitbox, HitboxCollisionType, updateHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { CollisionPushInfo, collisionBitsAreCompatible, getCollisionPushInfo } from "webgl-test-shared/dist/hitbox-collision";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import Board from "./Board";
import { onBallistaWoodenBoltCollision } from "./entities/projectiles/ballista-wooden-bolt";
import { onBallistaRockCollision } from "./entities/projectiles/ballista-rock";
import { onBallistaSlimeballCollision } from "./entities/projectiles/ballista-slimeball";
import { onBallistaFrostcicleCollision } from "./entities/projectiles/ballista-frostcicle";
import { onWoodenArrowCollision } from "./entities/projectiles/wooden-arrow";

export const enum CollisionVars {
   NO_COLLISION = 0xFFFF
}

/**
 * @returns A number where the first 8 bits hold the index of the entity's colliding hitbox, and the next 8 bits hold the index of the other entity's colliding hitbox
*/
export function entitiesAreColliding(entity1: EntityID, entity2: EntityID): number {
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
   const numHitboxes = transformComponent1.hitboxes.length;
   const numOtherHitboxes = transformComponent2.hitboxes.length;
   for (let i = 0; i < numHitboxes; i++) {
      const hitbox = transformComponent1.hitboxes[i];

      for (let j = 0; j < numOtherHitboxes; j++) {
         const otherHitbox = transformComponent2.hitboxes[j];

         // If the objects are colliding, add the colliding object and this object
         if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit) && hitbox.isColliding(otherHitbox)) {
            return i + (j << 8);
         }
      }
   }

   // If no hitboxes match, then they aren't colliding
   return CollisionVars.NO_COLLISION;
}

const resolveHardCollision = (transformComponent: TransformComponent, physicsComponent: PhysicsComponent, pushInfo: CollisionPushInfo): void => {
   // Transform the entity out of the hitbox
   transformComponent.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   transformComponent.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const projectionCoeff = physicsComponent.velocity.x * bx + physicsComponent.velocity.y * by;
   physicsComponent.velocity.x = bx * projectionCoeff;
   physicsComponent.velocity.y = by * projectionCoeff;
}

const resolveSoftCollision = (transformComponent: TransformComponent, physicsComponent: PhysicsComponent, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   // Force gets greater the further into each other the entities are
   const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
   const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / transformComponent.totalMass;
   
   physicsComponent.velocity.x += pushForce * Math.sin(pushInfo.direction);
   physicsComponent.velocity.y += pushForce * Math.cos(pushInfo.direction);
}

export function collide(entity: EntityID, pushingEntity: EntityID, pushedHitboxIdx: number, pushingHitboxIdx: number): void {
   const pushedEntityTransformComponent = TransformComponentArray.getComponent(entity);
   const pushingEntityTransformComponent = TransformComponentArray.getComponent(pushingEntity);
   
   const pushedHitbox = pushedEntityTransformComponent.hitboxes[pushedHitboxIdx];
   const pushingHitbox = pushingEntityTransformComponent.hitboxes[pushingHitboxIdx];
   
   const pushInfo = getCollisionPushInfo(pushedHitbox, pushingHitbox);

   // @Hack @Temporary
   const collisionPoint = new Point((pushedEntityTransformComponent.position.x + pushingEntityTransformComponent.position.x) / 2, (pushedEntityTransformComponent.position.y + pushingEntityTransformComponent.position.y) / 2);
   const entityType = Board.getEntityType(entity)!;
   
   if (collisionBitsAreCompatible(pushedEntityTransformComponent.collisionMask, pushedEntityTransformComponent.collisionBit, pushingEntityTransformComponent.collisionMask, pushingEntityTransformComponent.collisionBit) && PhysicsComponentArray.hasComponent(entity)) {
      const physicsComponent = PhysicsComponentArray.getComponent(entity);
      if (!physicsComponent.isImmovable) {
         if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
            resolveHardCollision(pushedEntityTransformComponent, physicsComponent, pushInfo);
         } else {
            resolveSoftCollision(pushedEntityTransformComponent, physicsComponent, pushingHitbox, pushInfo);
         }

         // @Cleanup: Should we just clean it immediately here?
         physicsComponent.positionIsDirty = true;
      }

      // @Hack
      switch (entityType) {
         case EntityType.iceShardProjectile: onIceShardCollision(entity, pushingEntity, collisionPoint); break;
      }
   }

   switch (entityType) {
      case EntityType.player: onPlayerCollision(entity, pushingEntity); break;
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: onTribesmanCollision(entity, pushingEntity); break;
      case EntityType.iceSpikes: onIceSpikesCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.cactus: onCactusCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.zombie: onZombieCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.slime: onSlimeCollision(entity, pushingEntity, collisionPoint); break;
      // @Cleanup:
      case EntityType.woodenArrow: onWoodenArrowCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.ballistaWoodenBolt: onBallistaWoodenBoltCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.ballistaRock: onBallistaRockCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.ballistaSlimeball: onBallistaSlimeballCollision(entity, pushingEntity, collisionPoint); break;
      case EntityType.ballistaFrostcicle: onBallistaFrostcicleCollision(entity, pushingEntity, collisionPoint); break;
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

/** If no collision is found, does nothing. */
export function resolveEntityTileCollision(entity: EntityID, hitbox: Hitbox, tileX: number, tileY: number): void {
   // @Speed
   const tileHitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, Settings.TILE_SIZE, Settings.TILE_SIZE, 0);
   updateHitbox(tileHitbox, (tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE, 0);
   
   if (hitbox.isColliding(tileHitbox)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const physicsComponent = PhysicsComponentArray.getComponent(entity);
      
      const pushInfo = getCollisionPushInfo(hitbox, tileHitbox);
      resolveHardCollision(transformComponent, physicsComponent, pushInfo);
   }
}