import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import { PhysicsComponent, PhysicsComponentArray } from "./components/PhysicsComponent";
import { CollisionPushInfo, collisionBitsAreCompatible, getCollisionPushInfo } from "battletribes-shared/hitbox-collision";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { ComponentArrays } from "./components/ComponentArray";
import { HitboxCollisionType, Hitbox, updateBox } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getEntityType } from "./world";
import { HitboxCollisionPair } from "./collision-detection";
import { ServerComponentType } from "../../shared/src/components";

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
      const box = hitbox.box;

      for (let j = 0; j < numOtherHitboxes; j++) {
         const otherHitbox = transformComponent2.hitboxes[j];
         const otherBox = otherHitbox.box;

         // If the objects are colliding, add the colliding object and this object
         if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit) && box.isColliding(otherBox)) {
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
   const selfVelocityProjectionCoeff = physicsComponent.selfVelocity.x * bx + physicsComponent.selfVelocity.y * by;
   physicsComponent.selfVelocity.x = bx * selfVelocityProjectionCoeff;
   physicsComponent.selfVelocity.y = by * selfVelocityProjectionCoeff;
   const externalVelocityProjectionCoeff = physicsComponent.externalVelocity.x * bx + physicsComponent.externalVelocity.y * by;
   physicsComponent.externalVelocity.x = bx * externalVelocityProjectionCoeff;
   physicsComponent.externalVelocity.y = by * externalVelocityProjectionCoeff;
}

const resolveSoftCollision = (transformComponent: TransformComponent, physicsComponent: PhysicsComponent, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   // Force gets greater the further into each other the entities are
   const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
   const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / transformComponent.totalMass;
   
   physicsComponent.externalVelocity.x += pushForce * Math.sin(pushInfo.direction);
   physicsComponent.externalVelocity.y += pushForce * Math.cos(pushInfo.direction);
}

export function collide(pushedEntity: EntityID, pushingEntity: EntityID, collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>): void {
   const pushedEntityTransformComponent = TransformComponentArray.getComponent(pushedEntity);
   const pushingEntityTransformComponent = TransformComponentArray.getComponent(pushingEntity);
   
   for (let i = 0; i < collidingHitboxPairs.length; i++) {
      const pair = collidingHitboxPairs[i];
      const pushingHitboxIdx = pair[0];
      const pushedHitboxIdx = pair[1];
   
      const pushedHitbox = pushedEntityTransformComponent.hitboxes[pushedHitboxIdx];
      const pushingHitbox = pushingEntityTransformComponent.hitboxes[pushingHitboxIdx];
      
      const pushInfo = getCollisionPushInfo(pushedHitbox.box, pushingHitbox.box);
      // if (getEntityType(pushingEntity) === EntityType.guardianGemQuake && getEntityType(pushedEntity) === EntityType.player) {
      //    console.log("pushing player");
      // }
   
      const physicsComponent = PhysicsComponentArray.getComponent(pushedEntity);
      if (!physicsComponent.isImmovable) {
         if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
            resolveHardCollision(pushedEntityTransformComponent, physicsComponent, pushInfo);
         } else {
            resolveSoftCollision(pushedEntityTransformComponent, physicsComponent, pushingHitbox, pushInfo);
         }

         // @Cleanup: Should we just clean it immediately here?
         physicsComponent.positionIsDirty = true;
      }
   
      // @Hack @Temporary
      const collisionPoint = new Point((pushedEntityTransformComponent.position.x + pushingEntityTransformComponent.position.x) / 2, (pushedEntityTransformComponent.position.y + pushingEntityTransformComponent.position.y) / 2);

      // @Speed: runs for every component array. Not ideal!
      for (const componentArray of ComponentArrays) {
         // The pushing entity is acting on the pushed entity, so the pushing entity is the one which should have events called
         if (componentArray.hasComponent(pushingEntity) && typeof componentArray.onHitboxCollision !== "undefined") {
            componentArray.onHitboxCollision(pushingEntity, pushedEntity, pushingHitbox, pushedHitbox, collisionPoint);
         }
      }
   }

   // @Speed: runs for every component array. Not ideal!
   for (const componentArray of ComponentArrays) {
      if (componentArray.hasComponent(pushingEntity) && typeof componentArray.onEntityCollision !== "undefined") {
         componentArray.onEntityCollision(pushingEntity, pushedEntity);
      }
   }

   // @Incomplete
   // switch (entityType) {
   //    case EntityType.player: onPlayerCollision(entity, pushingEntity); break;
   //    case EntityType.tribeWorker:
   //    case EntityType.tribeWarrior: onTribesmanCollision(entity, pushingEntity); break;
   //    case EntityType.iceSpikes: onIceSpikesCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.cactus: onCactusCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.zombie: onZombieCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.slime: onSlimeCollision(entity, pushingEntity, collisionPoint); break;
   //    // @Cleanup:
   //    case EntityType.woodenArrow: onWoodenArrowCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaWoodenBolt: onBallistaWoodenBoltCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaRock: onBallistaRockCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaSlimeball: onBallistaSlimeballCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaFrostcicle: onBallistaFrostcicleCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.yeti: onYetiCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.snowball: onSnowballCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.frozenYeti: onFrozenYetiCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.rockSpikeProjectile: onRockSpikeProjectileCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.spearProjectile: onSpearProjectileCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.slimeSpit: onSlimeSpitCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.spitPoisonArea: onSpitPoisonCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.battleaxeProjectile: onBattleaxeProjectileCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.iceArrow: onIceArrowCollision(entity, pushingEntity); break;
   //    case EntityType.pebblum: onPebblumCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.golem: onGolemCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.floorSpikes:
   //    case EntityType.wallSpikes: onSpikesCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.floorPunjiSticks:
   //    case EntityType.wallPunjiSticks: onPunjiSticksCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.embrasure: onEmbrasureCollision(pushingEntity, pushedHitboxIdx); break;
   // }
}

/** If no collision is found, does nothing. */
export function resolveEntityTileCollision(entity: EntityID, hitbox: Hitbox, tileX: number, tileY: number): void {
   // @Speed
   const tileBox = new RectangularBox(new Point(0, 0), Settings.TILE_SIZE, Settings.TILE_SIZE, 0);
   updateBox(tileBox, (tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE, 0);
   
   if (hitbox.box.isColliding(tileBox)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const physicsComponent = PhysicsComponentArray.getComponent(entity);
      
      const pushInfo = getCollisionPushInfo(hitbox.box, tileBox);
      resolveHardCollision(transformComponent, physicsComponent, pushInfo);

      physicsComponent.positionIsDirty = true;
   }
}