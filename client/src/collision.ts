import { Settings } from "webgl-test-shared/dist/settings";
import Entity from "./Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { collisionBitsAreCompatible, CollisionPushInfo, getCollisionPushInfo } from "webgl-test-shared/dist/hitbox-collision";
import { clampToBoardDimensions, Point } from "webgl-test-shared/dist/utils";
import Board from "./Board";
import { HitboxCollisionType, Hitbox, updateBox } from "webgl-test-shared/dist/boxes/boxes";
import RectangularBox from "webgl-test-shared/dist/boxes/RectangularBox";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./entity-components/TransformComponent";
import Chunk from "./Chunk";
import Player from "./entities/Player";
import { PhysicsComponentArray } from "./entity-components/PhysicsComponent";

interface EntityPairCollisionInfo {
   readonly minEntityInvolvedHitboxes: Array<Hitbox>;
   readonly maxEntityInvolvedHitboxes: Array<Hitbox>;
}

type CollisionPairs = Record<number, Record<number, EntityPairCollisionInfo | null>>;

const resolveHardCollision = (entity: Entity, pushInfo: CollisionPushInfo): void => {
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   
   // Transform the entity out of the hitbox
   transformComponent.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   transformComponent.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   const physicsComponent = entity.getServerComponent(ServerComponentType.physics);

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
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // Force gets greater the further into each other the entities are
   const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
   // @Incomplete: divide by total mass not just pushed hitbox mass
   const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / transformComponent.totalMass;
   
   physicsComponent.externalVelocity.x += pushForce * Math.sin(pushInfo.direction);
   physicsComponent.externalVelocity.y += pushForce * Math.cos(pushInfo.direction);
}

export function collide(entity: Entity, collidingEntity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void {
   if (entity.hasServerComponent(ServerComponentType.physics)) {
      const pushInfo = getCollisionPushInfo(pushedHitbox.box, pushingHitbox.box);
      if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
         resolveHardCollision(entity, pushInfo);
      } else {
         resolveSoftCollision(entity.id, pushingHitbox, pushInfo);
      }
   }

   for (let i = 0; i < entity.components.length; i++) {
      const component = entity.components[i];
      if (typeof component.onCollision !== "undefined") {
         component.onCollision(collidingEntity, pushedHitbox, pushingHitbox);
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

         // const collisionInfo = collisionPairs[minID][maxID];
         
         // const entity1HitboxIndex = collisionNum & 0xFF;
         // const entity2HitboxIndex = (collisionNum & 0xFF00) >> 8;

         // const transformComponent1 = TransformComponentArray.getComponent(entity1ID);
         // const hitbox = transformComponent1.hitboxes[entity1HitboxIndex];

         // const transformComponent2 = TransformComponentArray.getComponent(entity2ID);
         // const otherHitbox = transformComponent2.hitboxes[entity2HitboxIndex];

         // if (entity1ID > entity2ID) {
         //    collisionInfo.minEntityInvolvedHitboxes.push(otherHitbox);
         //    collisionInfo.maxEntityInvolvedHitboxes.push(hitbox);
         // } else {
         //    collisionInfo.minEntityInvolvedHitboxes.push(hitbox);
         //    collisionInfo.maxEntityInvolvedHitboxes.push(otherHitbox);
         // }

         // // @Hack @Temporary @Incomplete?
         // if (!transformComponent1.collidingEntities.includes(entity2)) {
         //    transformComponent1.collidingEntities.push(entity2);
         // }
         
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
   }
}

const resolveCollisionPairs = (collisionPairs: CollisionPairs, onlyResolvePlayerCollisions: boolean): void => {
   // @Speed: garbage collection
   for (const entity1ID of Object.keys(collisionPairs).map(Number)) {
      for (const entity2ID of Object.keys(collisionPairs[entity1ID]).map(Number)) {
         const collisionInfo = collisionPairs[entity1ID][entity2ID];
         if (collisionInfo === null) {
            continue;
         }

         // Note: from here, entity1ID < entity2ID (by definition)

         const entity1 = Board.entityRecord[entity1ID]!;
         const entity2 = Board.entityRecord[entity2ID]!;
         
         for (let i = 0; i < collisionInfo.minEntityInvolvedHitboxes.length; i++) {
            const entity1Hitbox = collisionInfo.minEntityInvolvedHitboxes[i];
            const entity2Hitbox = collisionInfo.maxEntityInvolvedHitboxes[i];

            if (!onlyResolvePlayerCollisions || entity1ID === Player.instance!.id) {
               collide(entity1, entity2, entity1Hitbox, entity2Hitbox);
            }
            if (!onlyResolvePlayerCollisions || entity2ID === Player.instance!.id) {
               collide(entity2, entity1, entity2Hitbox, entity1Hitbox);
            }
         }
      }
   }
}

export function resolveEntityCollisions(): void {
   const collisionPairs: CollisionPairs = {};
   
   const numChunks = Settings.BOARD_SIZE * Settings.BOARD_SIZE;
   for (let i = 0; i < numChunks; i++) {
      const chunk = Board.chunks[i];

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
   const transformComponent = player.getServerComponent(ServerComponentType.transform);

   for (const chunk of transformComponent.chunks) {
      collectEntityCollisionsWithChunk(collisionPairs, Player.instance!.id, chunk);
   }

   resolveCollisionPairs(collisionPairs, true);
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