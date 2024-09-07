import { Settings } from "webgl-test-shared/dist/settings";
import Entity from "./Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { collisionBitsAreCompatible, CollisionPushInfo, CollisionVars, getCollisionPushInfo } from "webgl-test-shared/dist/hitbox-collision";
import { clampToBoardDimensions, Point } from "webgl-test-shared/dist/utils";
import Board from "./Board";
import { HitboxCollisionType, HitboxWrapper, updateBox } from "webgl-test-shared/dist/boxes/boxes";
import RectangularBox from "webgl-test-shared/dist/boxes/RectangularBox";
import { COLLISION_BITS } from "webgl-test-shared/dist/collision";
import { latencyGameState } from "./game-state/game-states";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./entity-components/TransformComponent";

const resolveHardCollision = (entity: Entity, pushInfo: CollisionPushInfo): void => {
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   
   // Transform the entity out of the hitbox
   transformComponent.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   transformComponent.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   const physicsComponent = entity.getServerComponent(ServerComponentType.physics);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const projectionCoeff = physicsComponent.velocity.x * bx + physicsComponent.velocity.y * by;
   physicsComponent.velocity.x = bx * projectionCoeff;
   physicsComponent.velocity.y = by * projectionCoeff;
}

const resolveSoftCollision = (entity: Entity, pushedHitbox: HitboxWrapper, pushingHitbox: HitboxWrapper, pushInfo: CollisionPushInfo): void => {
   // Force gets greater the further into each other the entities are
   const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
   // @Incomplete: divide by total mass not just pushed hitbox mass
   const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / pushedHitbox.mass;

   const physicsComponent = entity.getServerComponent(ServerComponentType.physics);
   
   physicsComponent.velocity.x += pushForce * Math.sin(pushInfo.direction);
   physicsComponent.velocity.y += pushForce * Math.cos(pushInfo.direction);
}

export function collide(entity: Entity, collidingEntity: Entity, pushedHitbox: HitboxWrapper, pushingHitbox: HitboxWrapper): void {
   if (entity.hasServerComponent(ServerComponentType.physics)) {
      const pushInfo = getCollisionPushInfo(pushedHitbox.box, pushingHitbox.box);
      if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
         resolveHardCollision(entity, pushInfo);
      } else {
         resolveSoftCollision(entity, pushedHitbox, pushingHitbox, pushInfo);
      }
   }

   for (let i = 0; i < entity.components.length; i++) {
      const component = entity.components[i];
      if (typeof component.onCollision !== "undefined") {
         component.onCollision(collidingEntity, pushedHitbox, pushingHitbox);
      }
   }
}

const entitiesAreColliding = (entity1: EntityID, entity2: EntityID): number => {
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

export function resolveEntityCollisions(): void {
   const numChunks = Settings.BOARD_SIZE * Settings.BOARD_SIZE;
   for (let i = 0; i < numChunks; i++) {
      const chunk = Board.chunks[i];

      // @Bug: collision can happen multiple times
      // @Speed: physics-physics comparisons happen twice
      // For all physics entities, check for collisions with all other entities in the chunk
      for (let j = 0; j < chunk.physicsEntities.length; j++) {
         const entity1ID = chunk.physicsEntities[j];
         
         for (let k = 0; k < chunk.entities.length; k++) {
            const entity2ID = chunk.entities[k];
            // @Speed
            if (entity1ID === entity2ID) {
               continue;
            }

            const collisionNum = entitiesAreColliding(entity1ID, entity2ID);
            if (collisionNum !== CollisionVars.NO_COLLISION) {
               const entity1HitboxIndex = collisionNum & 0xFF;
               const entity2HitboxIndex = (collisionNum & 0xFF00) >> 8;

               const transformComponent1 = TransformComponentArray.getComponent(entity1ID);
               const hitbox = transformComponent1.hitboxes[entity1HitboxIndex];

               const transformComponent2 = TransformComponentArray.getComponent(entity2ID);
               const otherHitbox = transformComponent2.hitboxes[entity2HitboxIndex];

               // // @Hack @Temporary @Incomplete?
               // if (!transformComponent1.collidingEntities.includes(entity2)) {
               //    transformComponent1.collidingEntities.push(entity2);
               // }
               
               const entity1 = Board.entityRecord[entity1ID]!;
               const entity2 = Board.entityRecord[entity2ID]!;
               collide(entity1, entity2, hitbox, otherHitbox);
               collide(entity2, entity1, otherHitbox, hitbox);
               // } else {
               //    // @Hack
               //    if (otherTransformComponent.collisionBit === COLLISION_BITS.plants) {
               //       latencyGameState.lastPlantCollisionTicks = Board.serverTicks;
               //    }
               //    break;
               // }
            }

            // const entity2 = Board.entityRecord[entity2ID]!;
            // const otherTransformComponent = entity2.getServerComponent(ServerComponentType.transform);

            // for (const hitbox of transformComponent.hitboxes) {
            //    const box = hitbox.box;
            //    for (const otherHitbox of otherTransformComponent.hitboxes) {
            //       const otherBox = otherHitbox.box;
            //       if (box.isColliding(otherBox)) {
            //          if (!transformComponent.collidingEntities.includes(entity2)) {
            //             transformComponent.collidingEntities.push(entity2);
            //          }
                     
            //          if ((otherTransformComponent.collisionMask & transformComponent.collisionBit) !== 0 && (transformComponent.collisionMask & otherTransformComponent.collisionBit) !== 0) {
            //             collide(entity1, entity2, hitbox, otherHitbox);
            //             collide(entity2, entity1, otherHitbox, hitbox);
            //          } else {
            //             // @Hack
            //             if (otherTransformComponent.collisionBit === COLLISION_BITS.plants) {
            //                latencyGameState.lastPlantCollisionTicks = Board.serverTicks;
            //             }
            //             break;
            //          }
            //       }
            //    }
            // }
            // const collisionNum = entitiesAreColliding(entity1ID, entity2ID);
            // if (collisionNum !== CollisionVars.NO_COLLISION) {
            //    collisionPairs.push({
            //       entity1: entity1ID,
            //       entity2: entity2ID,
            //       collisionNum: collisionNum
            //    });
            // }
         }
      }
   }
}

export function resolveWallTileCollisions(entity: Entity): void {
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      const box = hitbox.box;
      
      // @Hack: use actual bounding area
      const minTileX = clampToBoardDimensions(Math.floor((transformComponent.position.x - 32) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((transformComponent.position.x + 32) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((transformComponent.position.y - 32) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((transformComponent.position.y + 32) / Settings.TILE_SIZE));
   
      // @Incomplete
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            const tile = Board.getTile(tileX, tileY);
            if (!tile.isWall) {
               continue;
            }

            // Check if the tile is colliding
            const tileCenterX = (tileX + 0.5) * Settings.TILE_SIZE;
            const tileCenterY = (tileY + 0.5) * Settings.TILE_SIZE;

            const tileBox = new RectangularBox(new Point(0, 0), Settings.TILE_SIZE, Settings.TILE_SIZE, 0);
            updateBox(tileBox, tileCenterX, tileCenterY, 0);

            if (box.isColliding(tileBox)) {
               const pushInfo = getCollisionPushInfo(box, tileBox);
               resolveHardCollision(entity, pushInfo);
            }
         }
      }
   }
}