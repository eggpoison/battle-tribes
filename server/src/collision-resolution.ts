import { TransformComponent, TransformComponentArray } from "./components/TransformComponent.js";
import { getComponentArrayRecord } from "./components/ComponentArray.js";
import { getEntityType } from "./world.js";
import { HitboxCollisionPair } from "./collision-detection.js";
import { getHitboxVelocity, Hitbox, addHitboxVelocity, setHitboxVelocity, translateHitbox, applyForce, hitboxIsStatic, getHitboxCollisionType } from "./hitboxes.js";
import { getEntityComponentTypes } from "./entity-component-types.js";
import { HitboxCollisionType, createRectangularBox, getBoxCollisionResult } from "../../shared/dist/boxes.js";
import { CollisionResult } from "../../shared/dist/collision.js";
import { Entity, EntityType } from "../../shared/dist/entities.js";
import { Settings } from "../../shared/dist/settings.js";
import { rotatePointAroundOrigin, _point, Point } from "../../shared/dist/utils.js";

const hitboxesAreTethered = (transformComponent: TransformComponent, hitbox1: Hitbox, hitbox2: Hitbox): boolean => {
   // @INCOMPLETE!
   
   // for ()
   
   // for (const tether of transformComponent.tethers) {
   //    if (tether.hitbox === hitbox1 && tether.originHitbox === hitbox2) {
   //       return true;
   //    }
   //    if (tether.hitbox === hitbox2 && tether.originHitbox === hitbox1) {
   //       return true;
   //    }
   // }
   return false;
}

const resolveHardCollision = (affectedHitbox: Hitbox, collisionResult: CollisionResult): void => {
   // @Temporary: Won't be needed once this switches to C++ (use builtin /= 0 check)
   if (collisionResult.overlap.magnitude() === 0) {
      throw new Error();
   }

   // Transform the entity out of the hitbox
   translateHitbox(affectedHitbox, collisionResult.overlap.x, collisionResult.overlap.y);

   const previousVelocity = getHitboxVelocity(affectedHitbox);

   // Kill all the velocity going into the hitbox
   const _bx = collisionResult.overlap.x / collisionResult.overlap.magnitude();
   const _by = collisionResult.overlap.y / collisionResult.overlap.magnitude();
   // @SPEED don't need a whole rotation for this
   rotatePointAroundOrigin(_bx, _by, Math.PI/2);
   // const bx = Math.sin(pushInfo.direction + Math.PI/2);
   // const by = Math.cos(pushInfo.direction + Math.PI/2);
   const bx = _point.x;
   const by = _point.y;
   const velocityProjectionCoeff = previousVelocity.x * bx + previousVelocity.y * by;
   const vx = bx * velocityProjectionCoeff;
   const vy = by * velocityProjectionCoeff;
   setHitboxVelocity(affectedHitbox, vx, vy);
}

const resolveHardCollisionAndFlip = (affectedHitbox: Hitbox, collisionResult: CollisionResult): void => {
   // @Temporary: Won't be needed once this switches to C++ (use builtin /= 0 check)
   if (collisionResult.overlap.magnitude() === 0) {
      throw new Error();
   }

   const previousVelocity = getHitboxVelocity(affectedHitbox);
   
   // Transform the entity out of the hitbox
   translateHitbox(affectedHitbox, collisionResult.overlap.x, collisionResult.overlap.y);

   // Reverse the velocity going into the hitbox
   
   const _separationAxisProjX = collisionResult.overlap.x / collisionResult.overlap.magnitude();
   const _separationAxisProjY = collisionResult.overlap.y / collisionResult.overlap.magnitude();
   // @Speed @Cleanup
   rotatePointAroundOrigin(_separationAxisProjX, _separationAxisProjY, Math.PI/2);
   // const separationAxisProjX = Math.sin(pushInfo.direction + Math.PI/2);
   // const separationAxisProjY = Math.cos(pushInfo.direction + Math.PI/2);
   const separationAxisProjX = _point.x;
   const separationAxisProjY = _point.y;
   
   const _pushAxisProjX = collisionResult.overlap.x / collisionResult.overlap.magnitude();
   const _pushAxisProjY = collisionResult.overlap.y / collisionResult.overlap.magnitude();
   // @Speed @Cleanup
   rotatePointAroundOrigin(_pushAxisProjX, _pushAxisProjY, Math.PI/2);
   // const pushAxisProjX = Math.sin(pushInfo.direction + Math.PI);
   // const pushAxisProjY = Math.cos(pushInfo.direction + Math.PI);
   const pushAxisProjX = _point.x;
   const pushAxisProjY = _point.y;
   
   const velocitySeparationCoeff = previousVelocity.x * separationAxisProjX + previousVelocity.y * separationAxisProjY;
   const velocityPushCoeff = previousVelocity.x * pushAxisProjX + previousVelocity.y * pushAxisProjY;
   // Keep the velocity in the separation axis
   setHitboxVelocity(affectedHitbox, separationAxisProjY * velocitySeparationCoeff, separationAxisProjX * velocitySeparationCoeff);
   // Reverse the velocity in the push axis
   addHitboxVelocity(affectedHitbox, -pushAxisProjX * velocityPushCoeff, -pushAxisProjY * velocityPushCoeff);
}

const resolveSoftCollision = (affectedHitbox: Hitbox, pushingHitbox: Hitbox, collisionResult: CollisionResult): void => {
   const pushForce = Settings.ENTITY_PUSH_FORCE * pushingHitbox.mass;
   applyForce(affectedHitbox, collisionResult.overlap.x * pushForce, collisionResult.overlap.y * pushForce);
}

export function collide(affectedEntity: Entity, collidingEntity: Entity, collidingHitboxPairs: readonly HitboxCollisionPair[]): void {
   const affectedEntityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
   
   const componentTypes = getEntityComponentTypes(getEntityType(affectedEntity));
   const componentArrayRecord = getComponentArrayRecord();
   
   // @Speed
   // @HACK @TEMPORARY
   const affectedEntityHitbox = affectedEntityTransformComponent.hitboxes[0];
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   const collidingEntityHitbox = collidingEntityTransformComponent.hitboxes[0];
   const collisionPoint = new Point((affectedEntityHitbox.box.posX + affectedEntityHitbox.box.posX) / 2, (affectedEntityHitbox.box.posY + affectedEntityHitbox.box.posY) / 2);
   
   for (let i = 0; i < collidingHitboxPairs.length; i++) {
      const pair = collidingHitboxPairs[i];
      const affectedHitbox = pair.affectedHitbox;
      const collidingHitbox = pair.collidingHitbox;

      // @HACK @SPEED: There is some very weird behaviour when two hitboxes are tethered and also can collide, so this shitter is here to prevent that
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      if (hitboxesAreTethered(affectedEntityTransformComponent, affectedHitbox, collidingHitbox) || hitboxesAreTethered(collidingEntityTransformComponent, affectedHitbox, collidingHitbox)) {
         continue;
      }

      // @Hack: this used to be after the collision physics code, but the cow hitbox collision function needs to know the velocity of the entity just before the collision happens.
      for (let i = 0; i < componentTypes.length; i++) {
         const componentType = componentTypes[i];
         const componentArray = componentArrayRecord[componentType];

         if (componentArray.onHitboxCollision !== undefined) {
            componentArray.onHitboxCollision(affectedHitbox, collidingHitbox, collisionPoint);
         }
      }
      
      // @Speed: what if there are many many hitbox pairs? will this be slow:?
      if (!hitboxIsStatic(affectedHitbox)) {
         if (getHitboxCollisionType(collidingHitbox) === HitboxCollisionType.hard) {
            resolveHardCollision(affectedHitbox, pair.collisionResult);
         } else {
            resolveSoftCollision(affectedHitbox, collidingHitbox, pair.collisionResult);
         }

         // @Cleanup: Should we just clean it immediately here?
         affectedEntityTransformComponent.isDirty = true;
      }
   }

   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType];

      if (componentArray.onEntityCollision !== undefined) {
         componentArray.onEntityCollision(affectedEntity, collidingEntity, collidingHitboxPairs);
      }
   }

   // @Incomplete
   // switch (entityType) {
   //    // @Cleanup:
   //    case EntityType.woodenArrow: onWoodenArrowCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaWoodenBolt: onBallistaWoodenBoltCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaRock: onBallistaRockCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaSlimeball: onBallistaSlimeballCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.ballistaFrostcicle: onBallistaFrostcicleCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.spitPoisonArea: onSpitPoisonCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.battleaxeProjectile: onBattleaxeProjectileCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.iceArrow: onIceArrowCollision(entity, pushingEntity); break;
   //    case EntityType.pebblum: onPebblumCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.golem: onGolemCollision(entity, pushingEntity, collisionPoint); break;
   //    case EntityType.embrasure: onEmbrasureCollision(pushingEntity, pushedHitboxIdx); break;
   // }
}

/** If no collision is found, does nothing. */
export function resolveWallCollision(hitbox: Hitbox, subtileX: number, subtileY: number): void {
   // @Copynpaste from boxIsCollidingWithSubtile
   // @Speed
   const tileBox = createRectangularBox((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE, 0, 0, 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
   
   const collisionResult = getBoxCollisionResult(hitbox.box, tileBox);
   if (!collisionResult.isColliding) {
      return;
   }

   const entity = hitbox.entity;
   // @Hack
   if (getEntityType(entity) === EntityType.guardianSpikyBall) {
      resolveHardCollisionAndFlip(hitbox, collisionResult);
   } else {
      resolveHardCollision(hitbox, collisionResult);
   }

   const componentTypes = getEntityComponentTypes(getEntityType(entity));
   const componentArrayRecord = getComponentArrayRecord();

   // Call wall collision events
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType];

      if (componentArray.onWallCollision !== undefined) {
         componentArray.onWallCollision(entity);
      }
   }
}