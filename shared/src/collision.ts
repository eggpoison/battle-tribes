import { Box, createRectangularBox, getRectangularBoxCollisionResult, getRectangularBoxTopLeftVertexOffset, getRectangularBoxTopRightVertexOffset, RectangularBox } from "./boxes.js";
import { Settings } from "./settings.js";
import { Mutable, Point, _point, angle, distance, polarVec2, rotatePointAroundPoint } from "./utils.js";

export const enum CollisionBit {
   default = 1 << 0,
   cactus = 1 << 1,
   none = 1 << 2,
   iceSpikes = 1 << 3,
   plant = 1 << 4,
   planterBox = 1 << 5,
   arrowPassable = 1 << 6,
   snowball = 1 << 7
};

export const DEFAULT_COLLISION_MASK = CollisionBit.default | CollisionBit.cactus | CollisionBit.iceSpikes | CollisionBit.plant | CollisionBit.planterBox | CollisionBit.arrowPassable | CollisionBit.snowball;

export interface CollisionResult {
   readonly isColliding: boolean;
   /**
    * A vector which would resolve the collision.
    * If isColliding is false then this value is just garbage and has no meaning.
    * */
   readonly overlap: Point;
   readonly collisionPoint: Point;
}

const getDot = (x: number, y: number, axisX: number, axisY: number): number => {
   return axisX * x + axisY * y;
}

const findMinWithOffset = (box: RectangularBox, x: number, y: number, axisX: number, axisY: number): number => {
   // @Speed: can combine bits of this in the getDot function

   // @Speed! @Temporary
   const topLeftVertex = getRectangularBoxTopLeftVertexOffset(box);
   const topRightVertex = getRectangularBoxTopRightVertexOffset(box);

   // Top left and bottom right
   let min = getDot(x + topLeftVertex.x, y + topLeftVertex.y, axisX, axisY);
   const bottomRight = getDot(x - topLeftVertex.x, y - topLeftVertex.y, axisX, axisY);
   if (bottomRight < min) {
      min = bottomRight;
   }

   // Top right and bottom left
   const topRight = getDot(x + topRightVertex.x, y + topRightVertex.y, axisX, axisY);
   if (topRight < min) {
      min = topRight;
   }
   const bottomLeft = getDot(x - topRightVertex.x, y - topRightVertex.y, axisX, axisY);
   if (bottomLeft < min) {
      min = bottomLeft;
   }

   return min;
}

const findMaxWithOffset = (box: RectangularBox, x: number, y: number, axisX: number, axisY: number): number => {
   // @Speed: can combine bits of this in the getDot function

   // @Speed! @Temporary
   const topLeftVertex = getRectangularBoxTopLeftVertexOffset(box);
   const topRightVertex = getRectangularBoxTopRightVertexOffset(box);

   // Top left and bottom right
   let max = getDot(x + topLeftVertex.x, y + topLeftVertex.y, axisX, axisY);
   const bottomRight = getDot(x - topLeftVertex.x, y - topLeftVertex.y, axisX, axisY);
   if (bottomRight > max) {
      max = bottomRight;
   }

   // Top right and bottom left
   const topRight = getDot(x + topRightVertex.x, y + topRightVertex.y, axisX, axisY);
   if (topRight > max) {
      max = topRight;
   }
   const bottomLeft = getDot(x - topRightVertex.x, y - topRightVertex.y, axisX, axisY);
   if (bottomLeft > max) {
      max = bottomLeft;
   }

   return max;
}

// @Cleanup: call these functions with the actual hitboxes

export function getCircleCircleCollisionResult(circle1x: number, circle1y: number, radius1: number, circle2x: number, circle2y: number, radius2: number): CollisionResult {
   const dist = distance(circle1x, circle1y, circle2x, circle2y);
      
   const amountIn = radius1 + radius2 - dist;
   const direction = angle(circle1x - circle2x, circle1y - circle2y);
   
   return {
      isColliding: amountIn > 0,
      overlap: polarVec2(amountIn, direction),
      collisionPoint: new Point(0, 0)
   };
}

/** Checks if a circle and rectangle are intersecting */
export function getCircleRectangleCollisionResult(circlePosX: number, circlePosY: number, circleRadius: number, rectPosX: number, rectPosY: number, rectWidth: number, rectHeight: number, rectRotation: number): CollisionResult {
   // Rotate the circle around the rectangle to "align" it
   rotatePointAroundPoint(circlePosX, circlePosY, rectPosX, rectPosY, -rectRotation);
   const circleX = _point.x;
   const circleY = _point.y;

   // 
   // Then do a regular rectangle check
   // 

   const distanceX = circleX - rectPosX;
   const distanceY = circleY - rectPosY;
   
   const absDistanceX = Math.abs(distanceX);
   const absDistanceY = Math.abs(distanceY);

   // Amount in the X axis the circular hitbox is inside the rectangle
   const horizontalAmountIn = rectWidth/2 + circleRadius - absDistanceX;
   // Amount in the Y axis the circular hitbox is inside the rectangle vertically
   const verticalAmountIn = rectHeight/2 + circleRadius - absDistanceY;
   
   if (horizontalAmountIn <= 0 || verticalAmountIn <= 0) {
      return {
         isColliding: false,
         overlap: new Point(0, 0),
         collisionPoint: new Point(0, 0)
      };
   }
   // Top and bottom collisions
   if (absDistanceX <= rectWidth/2) {
      const direction = rectRotation + (distanceY > 0 ? 0 : Math.PI);

      return {
         isColliding: true,
         // verticalAmountIn is guaranteed to be > 0 (see above)
         // @Speed: don't need sin/cos here at all
         overlap: polarVec2(verticalAmountIn, direction),
         collisionPoint: new Point(0, 0)
      };
   }
   // Left and right collisions
   if (absDistanceY <= rectHeight/2) {
      const direction = rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2);
      
      return {
         isColliding: true,
         // horizontalAmountIn is guaranteed to be > 0 (see above)
         // @Speed: don't need sin/cos here at all
         overlap: polarVec2(horizontalAmountIn, direction),
         collisionPoint: new Point(0, 0)
      };
   }

   const cornerDistanceSquared = Math.pow(absDistanceX - rectWidth/2, 2) + Math.pow(absDistanceY - rectHeight/2, 2);
   if (cornerDistanceSquared <= circleRadius * circleRadius) {
      const rectCornerX = circleX < rectPosX ? rectPosX - rectWidth/2 : rectPosX + rectWidth/2;
      const rectCornerY = circleY < rectPosY ? rectPosY - rectHeight/2 : rectPosY + rectHeight/2;

      const xDistanceFromRectBorder = Math.abs(rectCornerX - circleX);
      const yDistanceFromRectBorder = Math.abs(rectCornerY - circleY);

      // Whichever axis has the smallest amount in, we want to push it in that direction (least action to resolve the collision)
      // @Cleanup: Whole lot of copy and paste
      if (verticalAmountIn < horizontalAmountIn) {
         const len = Math.sqrt(circleRadius * circleRadius - xDistanceFromRectBorder * xDistanceFromRectBorder) - yDistanceFromRectBorder;
         const direction = rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0);
         
         // We check for this, cuz len=0 is bad! we don't want to return a collision with an overlap of (0, 0)! would be harmful
         if (len > 0) {
            return {
               isColliding: true,
               overlap: polarVec2(len, direction),
               collisionPoint: new Point(0, 0)
            };
         }
      } else {
         const len = Math.sqrt(circleRadius * circleRadius - yDistanceFromRectBorder * yDistanceFromRectBorder) - xDistanceFromRectBorder;
         const direction = rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2);
         
         // We check for this, cuz len=0 is bad! we don't want to return a collision with an overlap of (0, 0)! would be harmful
         if (len > 0) {
            return {
               isColliding: true,
               overlap: polarVec2(len, direction),
               collisionPoint: new Point(0, 0)
            };
         }
      }
   }

   return {
      isColliding: false,
      overlap: new Point(0, 0),
      collisionPoint: new Point(0, 0)
   };
}

/** Computes the axis for the line created by two points */
export function computeSideAxis(point1: Point, point2: Point): Point {
   const direction = point1.angleTo(point2);
   return polarVec2(1, direction);
}

function getOverlap(proj1min: number, proj1max: number, proj2min: number, proj2max: number) {
   return Math.min(proj1max, proj2max) - Math.max(proj1min, proj2min);
}

const updateMinOverlap = (collisionData: Mutable<CollisionResult>, proj1min: number, proj1max: number, proj2min: number, proj2max: number, axisX: number, axisY: number): void => {
   const axisOverlap = getOverlap(proj1min, proj1max, proj2min, proj2max);
   // The first check in this if statement is so that the first overlap will always ovreride, without it every single overlap will be discarded
   if ((collisionData.overlap.x === 0 && collisionData.overlap.y === 0) || axisOverlap < collisionData.overlap.magnitude()) {
      collisionData.overlap.x = axisOverlap * Math.sin(axisX);
      collisionData.overlap.y = axisOverlap * Math.cos(axisY);
   }
}

export function rectanglesAreColliding(box1: RectangularBox, box2: RectangularBox): CollisionResult {
   // @Incomplete: Collision point
   
   const collisionData: Mutable<CollisionResult> = {
      isColliding: false,
      overlap: new Point(0, 0),
      collisionPoint: new Point(0, 0)
   };

   const hitbox1x = box1.posX;
   const hitbox1y = box1.posY;
   const hitbox2x = box2.posX;
   const hitbox2y = box2.posY;
   
   // Axis 1
   const axis1min1 = findMinWithOffset(box1, hitbox1x, hitbox1y, box1.axisX, box1.axisY);
   const axis1max1 = findMaxWithOffset(box1, hitbox1x, hitbox1y, box1.axisX, box1.axisY);
   const axis1min2 = findMinWithOffset(box2, hitbox2x, hitbox2y, box1.axisX, box1.axisY);
   const axis1max2 = findMaxWithOffset(box2, hitbox2x, hitbox2y, box1.axisX, box1.axisY);
   if (axis1min2 >= axis1max1 || axis1min1 >= axis1max2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis1min1, axis1max1, axis1min2, axis1max2, box1.axisX, box1.axisY);
   
   // Axis 1 + 90deg
   const axis1ComplementMin1 = findMinWithOffset(box1, hitbox1x, hitbox1y, -box1.axisY, box1.axisX);
   const axis1ComplementMax1 = findMaxWithOffset(box1, hitbox1x, hitbox1y, -box1.axisY, box1.axisX);
   const axis1ComplementMin2 = findMinWithOffset(box2, hitbox2x, hitbox2y, -box1.axisY, box1.axisX);
   const axis1ComplementMax2 = findMaxWithOffset(box2, hitbox2x, hitbox2y, -box1.axisY, box1.axisX);
   if (axis1ComplementMin2 >= axis1ComplementMax1 || axis1ComplementMin1 >= axis1ComplementMax2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis1ComplementMin1, axis1ComplementMax1, axis1ComplementMin2, axis1ComplementMax2, -box1.axisY, box1.axisX);
   
   // Axis 2
   const axis2min1 = findMinWithOffset(box1, hitbox1x, hitbox1y, box2.axisX, box2.axisY);
   const axis2max1 = findMaxWithOffset(box1, hitbox1x, hitbox1y, box2.axisX, box2.axisY);
   const axis2min2 = findMinWithOffset(box2, hitbox2x, hitbox2y, box2.axisX, box2.axisY);
   const axis2max2 = findMaxWithOffset(box2, hitbox2x, hitbox2y, box2.axisX, box2.axisY);
   if (axis2min2 >= axis2max1 || axis2min1 >= axis2max2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis2min1, axis2max1, axis2min2, axis2max2, box2.axisX, box2.axisY);

   // Axis 2 + 90deg
   const axis2ComplementMin1 = findMinWithOffset(box1, hitbox1x, hitbox1y, -box2.axisY, box2.axisX);
   const axis2ComplementMax1 = findMaxWithOffset(box1, hitbox1x, hitbox1y, -box2.axisY, box2.axisX);
   const axis2ComplementMin2 = findMinWithOffset(box2, hitbox2x, hitbox2y, -box2.axisY, box2.axisX);
   const axis2ComplementMax2 = findMaxWithOffset(box2, hitbox2x, hitbox2y, -box2.axisY, box2.axisX);
   if (axis2ComplementMin2 >= axis2ComplementMax1 || axis2ComplementMin1 >= axis2ComplementMax2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis2ComplementMin1, axis2ComplementMax1, axis2ComplementMin2, axis2ComplementMax2, -box2.axisY, box2.axisX);

   const directionVectorX = box2.posX - box1.posX;
   const directionVectorY = box2.posY - box1.posY;

   // @Speed @Cleanup: why is this needed...
   if (collisionData.overlap.x * directionVectorX + collisionData.overlap.y * directionVectorY > 0) {
      collisionData.overlap.x *= -1;
      collisionData.overlap.y *= -1;
   }

   if (collisionData.overlap.x === 0 && collisionData.overlap.y === 0) {
      throw new Error();
   }

   // Is colliding!
   collisionData.isColliding = true;
   return collisionData;
}

export function boxIsCollidingWithSubtile(box: Box, subtileX: number, subtileY: number): boolean {
   // @Speed
   const tileBox = createRectangularBox((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE, 0, 0, 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
   
   const collisionResult = getRectangularBoxCollisionResult(tileBox, box);
   return collisionResult.isColliding;
}

export function boxIsCollidingWithTile(box: Box, tileX: number, tileY: number): boolean {
   // @Speed
   const tileBox = createRectangularBox((tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE, 0, 0, 0, Settings.TILE_SIZE, Settings.TILE_SIZE);
   
   const collisionResult = getRectangularBoxCollisionResult(tileBox, box);
   return collisionResult.isColliding;
}