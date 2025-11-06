import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { getComponentArrayRecord } from "./components/ComponentArray";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { getEntityComponentTypes, getEntityType } from "./world";
import { HitboxCollisionPair } from "./collision-detection";
import { getHitboxVelocity, Hitbox, addHitboxVelocity, setHitboxVelocity, translateHitbox, applyForce } from "./hitboxes";
import { CollisionResult } from "../../shared/src/collision";

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
   translateHitbox(affectedHitbox, collisionResult.overlap);

   const previousVelocity = getHitboxVelocity(affectedHitbox);

   // Kill all the velocity going into the hitbox
   const _bx = collisionResult.overlap.x / collisionResult.overlap.magnitude();
   const _by = collisionResult.overlap.y / collisionResult.overlap.magnitude();
   // @SPEED
   const bx = rotateXAroundOrigin(_bx, _by, Math.PI/2);
   const by = rotateYAroundOrigin(_bx, _by, Math.PI/2);
   // const bx = Math.sin(pushInfo.direction + Math.PI/2);
   // const by = Math.cos(pushInfo.direction + Math.PI/2);
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
   translateHitbox(affectedHitbox, collisionResult.overlap);

   // Reverse the velocity going into the hitbox
   
   const _separationAxisProjX = collisionResult.overlap.x / collisionResult.overlap.magnitude();
   const _separationAxisProjY = collisionResult.overlap.y / collisionResult.overlap.magnitude();
   // @Speed @Cleanup
   const separationAxisProjX = rotateXAroundOrigin(_separationAxisProjX, _separationAxisProjY, Math.PI/2);
   const separationAxisProjY = rotateYAroundOrigin(_separationAxisProjX, _separationAxisProjY, Math.PI/2);
   // const separationAxisProjX = Math.sin(pushInfo.direction + Math.PI/2);
   // const separationAxisProjY = Math.cos(pushInfo.direction + Math.PI/2);
   const _pushAxisProjX = collisionResult.overlap.x / collisionResult.overlap.magnitude();
   const _pushAxisProjY = collisionResult.overlap.y / collisionResult.overlap.magnitude();
   // @Speed @Cleanup
   const pushAxisProjX = rotateXAroundOrigin(_pushAxisProjX, _pushAxisProjY, Math.PI/2);
   const pushAxisProjY = rotateYAroundOrigin(_pushAxisProjX, _pushAxisProjY, Math.PI/2);
   // const pushAxisProjX = Math.sin(pushInfo.direction + Math.PI);
   // const pushAxisProjY = Math.cos(pushInfo.direction + Math.PI);
   
   const velocitySeparationCoeff = previousVelocity.x * separationAxisProjX + previousVelocity.y * separationAxisProjY;
   const velocityPushCoeff = previousVelocity.x * pushAxisProjX + previousVelocity.y * pushAxisProjY;
   // Keep the velocity in the separation axis
   setHitboxVelocity(affectedHitbox, separationAxisProjY * velocitySeparationCoeff, separationAxisProjX * velocitySeparationCoeff);
   // Reverse the velocity in the push axis
   addHitboxVelocity(affectedHitbox, new Point(-pushAxisProjX * velocityPushCoeff, -pushAxisProjY * velocityPushCoeff));
}

const resolveSoftCollision = (affectedHitbox: Hitbox, pushingHitbox: Hitbox, collisionResult: CollisionResult): void => {
   const pushForce = Settings.ENTITY_PUSH_FORCE * pushingHitbox.mass;
   applyForce(affectedHitbox, new Point(collisionResult.overlap.x * pushForce, collisionResult.overlap.y * pushForce));
}

export function collide(affectedEntity: Entity, collidingEntity: Entity, collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>): void {
   const affectedEntityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
   
   const componentTypes = getEntityComponentTypes(affectedEntity);
   const componentArrayRecord = getComponentArrayRecord();
   
   // @Speed
   // @HACK @TEMPORARY
   const affectedEntityHitbox = affectedEntityTransformComponent.hitboxes[0];
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   const collidingEntityHitbox = collidingEntityTransformComponent.hitboxes[0];
   const collisionPoint = new Point((affectedEntityHitbox.box.position.x + affectedEntityHitbox.box.position.x) / 2, (affectedEntityHitbox.box.position.y + affectedEntityHitbox.box.position.y) / 2);
   
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

         if (typeof componentArray.onHitboxCollision !== "undefined") {
            componentArray.onHitboxCollision(affectedHitbox, collidingHitbox, collisionPoint);
         }
      }
      
      // @Speed: what if there are many many hitbox pairs? will this be slow:?
      if (!affectedHitbox.isStatic) {
         if (collidingHitbox.collisionType === HitboxCollisionType.hard) {
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

      if (typeof componentArray.onEntityCollision !== "undefined") {
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
   const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
   const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
   
   const collisionResult = hitbox.box.getCollisionResult(tileBox);
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

   const componentTypes = getEntityComponentTypes(entity);
   const componentArrayRecord = getComponentArrayRecord();

   // Call wall collision events
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType];

      if (typeof componentArray.onWallCollision !== "undefined") {
         componentArray.onWallCollision(entity);
      }
   }
   
}