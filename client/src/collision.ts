import { Point, clampToBoardDimensions, distance, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { HitboxVertexPositions, circleAndRectangleDoIntersect, rectanglePointsDoIntersect } from "webgl-test-shared/dist/collision-detection";
import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Hitbox from "./hitboxes/Hitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Entity from "./Entity";
import Board from "./Board";
import { ServerComponentType } from "webgl-test-shared/dist/components";

interface CollisionPushInfo {
   direction: number;
   amountIn: number;
}

const getCircleCircleCollisionPushInfo = (pushedHitbox: CircularHitbox, pushingHitbox: CircularHitbox): CollisionPushInfo => {
   const dist = pushedHitbox.position.calculateDistanceBetween(pushingHitbox.position);
   
   return {
      amountIn: pushedHitbox.radius + pushingHitbox.radius - dist,
      direction: pushingHitbox.position.calculateAngleBetween(pushedHitbox.position)
   };
}

const getCircleRectCollisionPushInfo = (pushedHitbox: CircularHitbox, rectX: number, rectY: number, rectWidth: number, rectHeight: number, rectRotation: number): CollisionPushInfo => {
   const circlePosX = rotateXAroundPoint(pushedHitbox.position.x, pushedHitbox.position.y, rectX, rectY, -rectRotation);
   const circlePosY = rotateYAroundPoint(pushedHitbox.position.x, pushedHitbox.position.y, rectX, rectY, -rectRotation);
   
   const distanceX = circlePosX - rectX;
   const distanceY = circlePosY - rectY;

   const absDistanceX = Math.abs(distanceX);
   const absDistanceY = Math.abs(distanceY);

   // Top and bottom collisions
   if (absDistanceX <= (rectWidth/2)) {
      return {
         amountIn: rectHeight/2 + pushedHitbox.radius - absDistanceY,
         direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
      };
   }

   // Left and right collisions
   if (absDistanceY <= (rectHeight/2)) {
      return {
         amountIn: rectWidth/2 + pushedHitbox.radius - absDistanceX,
         direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
      };
   }

   const cornerDistanceSquared = Math.pow(absDistanceX - rectWidth/2, 2) + Math.pow(absDistanceY - rectHeight/2, 2);
   if (cornerDistanceSquared <= pushedHitbox.radius * pushedHitbox.radius) {
      // @Cleanup: Whole lot of copy and paste
      const amountInX = absDistanceX - rectWidth/2 - pushedHitbox.radius;
      const amountInY = absDistanceY - rectHeight/2 - pushedHitbox.radius;
      if (Math.abs(amountInY) < Math.abs(amountInX)) {
         const closestRectBorderY = circlePosY < rectY ? rectY - rectHeight/2 : rectY + rectHeight/2;
         const closestRectBorderX = circlePosX < rectX ? rectX - rectWidth/2 : rectX + rectWidth/2;
         const xDistanceFromRectBorder = Math.abs(closestRectBorderX - circlePosX);
         const len = Math.sqrt(pushedHitbox.radius * pushedHitbox.radius - xDistanceFromRectBorder * xDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderY - (circlePosY - len * Math.sign(distanceY))),
            direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
         };
      } else {
         const closestRectBorderX = circlePosX < rectX ? rectX - rectWidth/2 : rectX + rectWidth/2;
         
         const closestRectBorderY = circlePosY < rectY ? rectY - rectHeight/2 : rectY + rectHeight/2;
         const yDistanceFromRectBorder = Math.abs(closestRectBorderY - circlePosY);
         const len = Math.sqrt(pushedHitbox.radius * pushedHitbox.radius - yDistanceFromRectBorder * yDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderX - (circlePosX - len * Math.sign(distanceX))),
            direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
         };
      }
   }

   console.warn("Couldn't find the collision!");
   return {
      amountIn: 0,
      direction: 0
   };
}

const getCollisionPushInfo = (pushedHitbox: Hitbox, pushingHitbox: Hitbox): CollisionPushInfo => {
   if (pushedHitbox.hasOwnProperty("radius") && pushingHitbox.hasOwnProperty("radius")) {
      // Circle + Circle
      return getCircleCircleCollisionPushInfo(pushedHitbox as CircularHitbox, pushingHitbox as CircularHitbox);
   } else if (pushedHitbox.hasOwnProperty("radius") && !pushingHitbox.hasOwnProperty("radius")) {
      // Circle + Rectangle
      const rectWidth = (pushingHitbox as RectangularHitbox).width;
      const rectHeight = (pushingHitbox as RectangularHitbox).height;
      const rectRotation = (pushingHitbox as RectangularHitbox).rotation + (pushingHitbox as RectangularHitbox).externalRotation;
      return getCircleRectCollisionPushInfo(pushedHitbox as CircularHitbox, pushingHitbox.position.x, pushingHitbox.position.y, rectWidth, rectHeight, rectRotation);
   } else if (!pushedHitbox.hasOwnProperty("radius") && pushingHitbox.hasOwnProperty("radius")) {
      // Rectangle + Circle
      const rectWidth = (pushingHitbox as RectangularHitbox).width;
      const rectHeight = (pushingHitbox as RectangularHitbox).height;
      const rectRotation = (pushingHitbox as RectangularHitbox).rotation + (pushingHitbox as RectangularHitbox).externalRotation;
      const pushInfo = getCircleRectCollisionPushInfo(pushingHitbox as CircularHitbox, pushingHitbox.position.x, pushingHitbox.position.y, rectWidth, rectHeight, rectRotation);
      pushInfo.direction += Math.PI;
      return pushInfo;
   } else {
      // Rectangle + Rectangle
      // @Incomplete
      throw new Error();
   }
}

const resolveHardCollision = (entity: Entity, pushInfo: CollisionPushInfo): void => {
   // Transform the entity out of the hitbox
   entity.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   entity.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   const physicsComponent = entity.getServerComponent(ServerComponentType.physics);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const projectionCoeff = physicsComponent.velocity.x * bx + physicsComponent.velocity.y * by;
   physicsComponent.velocity.x = bx * projectionCoeff;
   physicsComponent.velocity.y = by * projectionCoeff;
}

const resolveSoftCollision = (entity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   // Force gets greater the further into each other the entities are
   const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
   // @Incomplete: divide by total mass not just pushed hitbox mass
   const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / pushedHitbox.mass;

   const physicsComponent = entity.getServerComponent(ServerComponentType.physics);
   
   physicsComponent.velocity.x += pushForce * Math.sin(pushInfo.direction);
   physicsComponent.velocity.y += pushForce * Math.cos(pushInfo.direction);
}

export function collide(entity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void {
   const pushInfo = getCollisionPushInfo(pushedHitbox, pushingHitbox);
   if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
      resolveHardCollision(entity, pushInfo);
   } else {
      resolveSoftCollision(entity, pushedHitbox, pushingHitbox, pushInfo);
   }
}

export function resolveWallTileCollisions(entity: Entity): void {
   for (let i = 0; i < entity.hitboxes.length; i++) {
      const hitbox = entity.hitboxes[i];
      
      const minTileX = clampToBoardDimensions(Math.floor((entity.position.x - 32) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((entity.position.x + 32) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((entity.position.y - 32) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((entity.position.y + 32) / Settings.TILE_SIZE));
   
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

         if (hitbox.hasOwnProperty("radius")) {
            // Circular
            if (!circleAndRectangleDoIntersect(hitbox.position.x, hitbox.position.y, (hitbox as CircularHitbox).radius, tileCenterX, tileCenterY, Settings.TILE_SIZE, Settings.TILE_SIZE, 0)) {
               continue;
            }
         } else {
            // Rectangular

            // If the distance between the hitboxes is greater than the sum of their half diagonals then they're not colliding
            const dist = distance(tileCenterX, tileCenterY, hitbox.position.x, hitbox.position.y);
            const halfDiagonalLength = Math.sqrt(Settings.TILE_SIZE * Settings.TILE_SIZE / 4 + Settings.TILE_SIZE * Settings.TILE_SIZE / 4);
            if (dist > halfDiagonalLength + (hitbox as RectangularHitbox).halfDiagonalLength) {
               continue;
            }
            
            // @Speed
            const tileVertexPositions: HitboxVertexPositions = [
               new Point(tileCenterX - Settings.TILE_SIZE/2, tileCenterY + Settings.TILE_SIZE/2),
               new Point(tileCenterX + Settings.TILE_SIZE/2, tileCenterY + Settings.TILE_SIZE/2),
               new Point(tileCenterX - Settings.TILE_SIZE/2, tileCenterY - Settings.TILE_SIZE/2),
               new Point(tileCenterX + Settings.TILE_SIZE/2, tileCenterY - Settings.TILE_SIZE/2)
            ];
            if (!rectanglePointsDoIntersect(tileVertexPositions, (hitbox as RectangularHitbox).vertexPositions, 0, 0, 0, 0, 0, 1, (hitbox as RectangularHitbox).sideAxes[0].x, (hitbox as RectangularHitbox).sideAxes[0].y)) {
               continue;
            }
         }

            // Resolve collision
            let pushInfo: CollisionPushInfo | undefined; // @Temporary (undefined)
            if (hitbox.hasOwnProperty("radius")) {
               pushInfo = getCircleRectCollisionPushInfo(hitbox as CircularHitbox, tileCenterX, tileCenterY, Settings.TILE_SIZE, Settings.TILE_SIZE, 0);
            }

            // @Temporary
            if (typeof pushInfo !== "undefined") {
               resolveHardCollision(entity, pushInfo);
            }
         }
      }
   }
}