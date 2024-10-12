import { getChunk } from "./board-interface";
import { rectanglesAreColliding } from "./collision";
import { EntityID } from "./entities";
import { createNormalStructureHitboxes } from "./boxes/entity-hitbox-creation";
import { Box, boxIsCircular, assertBoxIsRectangular, updateBox, BoxWrapper, Hitbox } from "./boxes/boxes";
import { Settings } from "./settings";
import { StructureType, WorldInfo } from "./structures";
import { angle, rotateXAroundPoint, rotateYAroundPoint } from "./utils";
import CircularBox from "./boxes/CircularBox";
import RectangularBox from "./boxes/RectangularBox";

export interface CollisionPushInfo {
   direction: number;
   amountIn: number;
}

export const enum CollisionVars {
   NO_COLLISION = 0xFFFF
}

const getCircleCircleCollisionPushInfo = (pushedBox: CircularBox, pushingBox: CircularBox): CollisionPushInfo => {
   const dist = Math.sqrt(Math.pow(pushedBox.position.x - pushingBox.position.x, 2) + Math.pow(pushedBox.position.y - pushingBox.position.y, 2));
   
   return {
      amountIn: pushedBox.radius + pushingBox.radius - dist,
      // Angle from pushing hitbox to pushed hitbox
      direction: angle(pushedBox.position.x - pushingBox.position.x, pushedBox.position.y - pushingBox.position.y)
   };
}

const getCircleRectCollisionPushInfo = (pushedBox: CircularBox, pushingBox: RectangularBox): CollisionPushInfo => {
   const rectRotation = pushingBox.rotation;

   const circlePosX = rotateXAroundPoint(pushedBox.position.x, pushedBox.position.y, pushingBox.position.x, pushingBox.position.y, -rectRotation);
   const circlePosY = rotateYAroundPoint(pushedBox.position.x, pushedBox.position.y, pushingBox.position.x, pushingBox.position.y, -rectRotation);
   
   const distanceX = circlePosX - pushingBox.position.x;
   const distanceY = circlePosY - pushingBox.position.y;

   const absDistanceX = Math.abs(distanceX);
   const absDistanceY = Math.abs(distanceY);

   // Top and bottom collisions
   if (absDistanceX <= (pushingBox.width/2)) {
      return {
         amountIn: pushingBox.height/2 + pushedBox.radius - absDistanceY,
         direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
      };
   }

   // Left and right collisions
   if (absDistanceY <= (pushingBox.height/2)) {
      return {
         amountIn: pushingBox.width/2 + pushedBox.radius - absDistanceX,
         direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
      };
   }

   const cornerDistanceSquared = Math.pow(absDistanceX - pushingBox.width/2, 2) + Math.pow(absDistanceY - pushingBox.height/2, 2);
   if (cornerDistanceSquared <= pushedBox.radius * pushedBox.radius) {
      // @Cleanup: Whole lot of copy and paste
      const amountInX = absDistanceX - pushingBox.width/2 - pushedBox.radius;
      const amountInY = absDistanceY - pushingBox.height/2 - pushedBox.radius;
      if (Math.abs(amountInY) < Math.abs(amountInX)) {
         const closestRectBorderY = circlePosY < pushingBox.position.y ? pushingBox.position.y - pushingBox.height/2 : pushingBox.position.y + pushingBox.height/2;
         const closestRectBorderX = circlePosX < pushingBox.position.x ? pushingBox.position.x - pushingBox.width/2 : pushingBox.position.x + pushingBox.width/2;
         const xDistanceFromRectBorder = Math.abs(closestRectBorderX - circlePosX);
         const len = Math.sqrt(pushedBox.radius * pushedBox.radius - xDistanceFromRectBorder * xDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderY - (circlePosY - len * Math.sign(distanceY))),
            direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
         };
      } else {
         const closestRectBorderX = circlePosX < pushingBox.position.x ? pushingBox.position.x - pushingBox.width/2 : pushingBox.position.x + pushingBox.width/2;
         
         const closestRectBorderY = circlePosY < pushingBox.position.y ? pushingBox.position.y - pushingBox.height/2 : pushingBox.position.y + pushingBox.height/2;
         const yDistanceFromRectBorder = Math.abs(closestRectBorderY - circlePosY);
         const len = Math.sqrt(pushedBox.radius * pushedBox.radius - yDistanceFromRectBorder * yDistanceFromRectBorder);

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

export function getCollisionPushInfo(pushedHitbox: Box, pushingHitbox: Box): CollisionPushInfo {
   const pushedHitboxIsCircular = boxIsCircular(pushedHitbox);
   const pushingHitboxIsCircular = boxIsCircular(pushingHitbox);
   
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
      
      assertBoxIsRectangular(pushedHitbox);
      assertBoxIsRectangular(pushingHitbox);
      
      // @Cleanup: copy and paste
      const collisionData = rectanglesAreColliding(pushedHitbox, pushingHitbox);
      if (!collisionData.isColliding) {
         throw new Error();
      }
      
      return {
         amountIn: collisionData.overlap,
         // @Hack
         direction: angle(collisionData.axisX, collisionData.axisY)
      };
   }
}

export function hitboxesAreColliding(hitbox: Box, hitboxes: ReadonlyArray<Hitbox>, epsilon: number = 0): boolean {
   for (let j = 0; j < hitboxes.length; j++) {
      const otherHitbox = hitboxes[j];

      // If the objects are colliding, add the colliding object and this object
      if (hitbox.isColliding(otherHitbox.box, epsilon)) {
         return true;
      }
   }

   // If no hitboxes match, then they aren't colliding
   return false;
}

export function collisionBitsAreCompatible(collisionMask1: number, collisionBit1: number, collisionMask2: number, collisionBit2: number): boolean {
   return (collisionMask1 & collisionBit2) !== 0 && (collisionMask2 & collisionBit1) !== 0;
}

export function getBoxesCollidingEntities(worldInfo: WorldInfo, boxWrappers: ReadonlyArray<BoxWrapper>, epsilon: number = 0): Array<EntityID> {
   const collidingEntities = new Array<EntityID>();
   const seenEntityIDs = new Set<number>();
   
   for (let i = 0; i < boxWrappers.length; i++) {
      const hitbox = boxWrappers[i];
      const box = hitbox.box;

      let minX = box.calculateBoundsMinX();
      let maxX = box.calculateBoundsMaxX();
      let minY = box.calculateBoundsMinY();
      let maxY = box.calculateBoundsMaxY();
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
               if (hitboxesAreColliding(box, entity.hitboxes, epsilon)) {
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
   const testHitboxes = createNormalStructureHitboxes(entityType);
   for (let i = 0; i < testHitboxes.length; i++) {
      const hitbox = testHitboxes[i];
      updateBox(hitbox.box, x, y, rotation);
   }
   
   return getBoxesCollidingEntities(worldInfo, testHitboxes, epsilon);
}