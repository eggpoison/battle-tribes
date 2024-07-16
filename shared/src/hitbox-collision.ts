import { Chunks, EntityInfo, getChunk } from "./board-interface";
import { rectanglesAreColliding } from "./collision";
import { EntityID } from "./entities";
import { createEntityHitboxes } from "./hitboxes/entity-hitbox-creation";
import { CircularHitbox, RectangularHitbox, Hitbox, hitboxIsCircular, assertHitboxIsRectangular, updateHitbox } from "./hitboxes/hitboxes";
import { Settings } from "./settings";
import { StructureType, WorldInfo } from "./structures";
import { angle, rotateXAroundPoint, rotateYAroundPoint } from "./utils";

export interface CollisionPushInfo {
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

export function getCollisionPushInfo(pushedHitbox: Hitbox, pushingHitbox: Hitbox): CollisionPushInfo {
   const pushedHitboxIsCircular = hitboxIsCircular(pushedHitbox);
   const pushingHitboxIsCircular = hitboxIsCircular(pushingHitbox);
   
   if (pushedHitboxIsCircular && pushingHitboxIsCircular) {
      // Circle + Circle
      return getCircleCircleCollisionPushInfo(pushedHitbox, pushingHitbox);
   } else if (pushedHitboxIsCircular && !pushingHitboxIsCircular) {
      // Circle + Rectangle
      return getCircleRectCollisionPushInfo(pushedHitbox, pushingHitbox);
   } else if (!pushedHitboxIsCircular && pushingHitboxIsCircular) {
      // Rectangle + Circle
      const pushInfo = getCircleRectCollisionPushInfo(pushingHitbox, pushedHitbox);
      pushInfo.direction += Math.PI;
      return pushInfo;
   } else {
      // Rectangle + Rectangle
      
      assertHitboxIsRectangular(pushedHitbox);
      assertHitboxIsRectangular(pushingHitbox);
      
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

export function hitboxesAreColliding(hitbox: Hitbox, hitboxes: ReadonlyArray<Hitbox>, epsilon: number = 0): boolean {
   for (let j = 0; j < hitboxes.length; j++) {
      const otherHitbox = hitboxes[j];

      // If the objects are colliding, add the colliding object and this object
      if (hitbox.isColliding(otherHitbox, epsilon)) {
         return true;
      }
   }

   // If no hitboxes match, then they aren't colliding
   return false;
}

export function collisionBitsAreCompatible(collisionMask1: number, collisionBit1: number, collisionMask2: number, collisionBit2: number): boolean {
   return (collisionMask1 & collisionBit2) !== 0 && (collisionMask2 & collisionBit1) !== 0;
}

export function getHitboxesCollidingEntities(worldInfo: WorldInfo, hitboxes: ReadonlyArray<Hitbox>, epsilon: number = 0): Array<EntityID> {
   const collidingEntities = new Array<EntityID>();
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
            const chunk = getChunk(worldInfo.chunks, chunkX, chunkY);
            for (let j = 0; j < chunk.entities.length; j++) {
               const entityID = chunk.entities[j];
               if (seenEntityIDs.has(entityID)) {
                  continue;
               }

               seenEntityIDs.add(entityID);
               
               const entity = worldInfo.getEntityCallback(entityID);
               if (hitboxesAreColliding(hitbox, entity.hitboxes, epsilon)) {
                  collidingEntities.push(entityID);
               }
            }
         }
      }
   }

   return collidingEntities;
}

// @Cleanup: broaden to EntityType instead of StructureType
export function estimateCollidingEntities(worldInfo: WorldInfo, entityType: StructureType, x: number, y: number, rotation: number, epsilon: number): Array<EntityID> {
   const testHitboxes = createEntityHitboxes(entityType);
   for (let i = 0; i < testHitboxes.length; i++) {
      const hitbox = testHitboxes[i];
      updateHitbox(hitbox, x, y, rotation);
   }
   
   return getHitboxesCollidingEntities(worldInfo, testHitboxes, epsilon);
}