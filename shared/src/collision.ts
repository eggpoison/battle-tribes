import { RectangularBox } from "./boxes/RectangularBox";
import { Mutable, Point, distance, rotateXAroundPoint, rotateYAroundPoint } from "./utils";

// @Speed: Maybe make into const enum?
export const COLLISION_BITS = {
   default: 1 << 0,
   cactus: 1 << 1,
   none: 1 << 2,
   iceSpikes: 1 << 3,
   plants: 1 << 4,
   planterBox: 1 << 5
};

export const DEFAULT_COLLISION_MASK = COLLISION_BITS.default | COLLISION_BITS.cactus | COLLISION_BITS.iceSpikes | COLLISION_BITS.plants | COLLISION_BITS.planterBox;

export const enum HitboxCollisionBit {
   DEFAULT = 1 << 0,
   ARROW_PASSABLE = 1 << 1
}

export const DEFAULT_HITBOX_COLLISION_MASK = HitboxCollisionBit.DEFAULT | HitboxCollisionBit.ARROW_PASSABLE;

export interface CollisionData {
   readonly isColliding: boolean;
   readonly axisX: number;
   readonly axisY: number;
   readonly overlap: number;
   readonly collisionPoint: Point;
}

const getDot = (vertexX: number, vertexY: number, x: number, y: number, axisX: number, axisY: number): number => {
   return axisX * (vertexX + x) + axisY * (vertexY + y);
}

const findMinWithOffset = (box: RectangularBox, x: number, y: number, axisX: number, axisY: number): number => {
   // @Speed: can combine bits of this in the getDot function

   // Top left and bottom right
   const topLeftVertex = box.topLeftVertexOffset;
   let min = getDot(topLeftVertex.x, topLeftVertex.y, x, y, axisX, axisY);
   const bottomRight = getDot(-topLeftVertex.x, -topLeftVertex.y, x, y, axisX, axisY);
   if (bottomRight < min) {
      min = bottomRight;
   }

   // Top right and bottom left
   const topRightVertex = box.topRightVertexOffset;
   const topRight = getDot(topRightVertex.x, topRightVertex.y, x, y, axisX, axisY);
   if (topRight < min) {
      min = topRight;
   }
   const bottomLeft = getDot(-topRightVertex.x, -topRightVertex.y, x, y, axisX, axisY);
   if (bottomLeft < min) {
      min = bottomLeft;
   }

   return min;
}

const findMaxWithOffset = (box: RectangularBox, x: number, y: number, axisX: number, axisY: number): number => {
   // @Speed: can combine bits of this in the getDot function

   // Top left and bottom right
   const topLeftVertex = box.topLeftVertexOffset;
   let max = getDot(topLeftVertex.x, topLeftVertex.y, x, y, axisX, axisY);
   const bottomRight = getDot(-topLeftVertex.x, -topLeftVertex.y, x, y, axisX, axisY);
   if (bottomRight > max) {
      max = bottomRight;
   }

   // Top right and bottom left
   const topRightVertex = box.topRightVertexOffset;
   const topRight = getDot(topRightVertex.x, topRightVertex.y, x, y, axisX, axisY);
   if (topRight > max) {
      max = topRight;
   }
   const bottomLeft = getDot(-topRightVertex.x, -topRightVertex.y, x, y, axisX, axisY);
   if (bottomLeft > max) {
      max = bottomLeft;
   }

   return max;
}

// @Cleanup: call these functions with the actual hitboxes

export function circlesDoIntersect(circle1Pos: Point, radius1: number, circle2Pos: Point, radius2: number): boolean {
   const dist = distance(circle1Pos.x, circle1Pos.y, circle2Pos.x, circle2Pos.y);
   return dist <= radius1 + radius2;
}

/** Checks if a circle and rectangle are intersecting */
export function circleAndRectangleDoIntersect(circlePos: Point, circleRadius: number, rectPos: Point, rectWidth: number, rectHeight: number, rectRotation: number): boolean {
   // Rotate the circle around the rectangle to "align" it
   const alignedCirclePosX = rotateXAroundPoint(circlePos.x, circlePos.y, rectPos.x, rectPos.y, -rectRotation);
   const alignedCirclePosY = rotateYAroundPoint(circlePos.x, circlePos.y, rectPos.x, rectPos.y, -rectRotation);

   // 
   // Then do a regular rectangle check
   // 

   const distanceX = Math.abs(alignedCirclePosX - rectPos.x);
   const distanceY = Math.abs(alignedCirclePosY - rectPos.y);

   if (distanceX > (rectWidth/2 + circleRadius)) return false;
   if (distanceY > (rectHeight/2 + circleRadius)) return false;

   if (distanceX <= rectWidth/2) return true;
   if (distanceY <= rectHeight/2) return true;

   const cornerDistanceSquared = Math.pow(distanceX - rectWidth/2, 2) + Math.pow(distanceY - rectHeight/2, 2);
   return cornerDistanceSquared <= Math.pow(circleRadius, 2);
}

/** Computes the axis for the line created by two points */
export function computeSideAxis(point1: Point, point2: Point): Point {
   const direction = point1.calculateAngleBetween(point2);
   return Point.fromVectorForm(1, direction);
}

function getOverlap(proj1min: number, proj1max: number, proj2min: number, proj2max: number) {
    return Math.min(proj1max, proj2max) - Math.max(proj1min, proj2min);
}

const updateMinOverlap = (collisionData: Mutable<CollisionData>, proj1min: number, proj1max: number, proj2min: number, proj2max: number, axisX: number, axisY: number): void => {
   const axisOverlap = getOverlap(proj1min, proj1max, proj2min, proj2max);
   if (axisOverlap < collisionData.overlap) {
      collisionData.overlap = axisOverlap;
      collisionData.axisX = axisX;
      collisionData.axisY = axisY;
   }
}

export function rectanglesAreColliding(box1: RectangularBox, box2: RectangularBox): CollisionData {
   // @Incomplete: Collision point
   
   const collisionData: Mutable<CollisionData> = {
      isColliding: false,
      axisX: 0,
      axisY: 0,
      overlap: Number.MAX_SAFE_INTEGER,
      collisionPoint: new Point(0, 0)
   };

   const hitbox1x = box1.position.x;
   const hitbox1y = box1.position.y;
   const hitbox2x = box2.position.x;
   const hitbox2y = box2.position.y;
   
   // Axis 1
   const axis1min1 = findMinWithOffset(box1, hitbox1x, hitbox1y, box1.axisX, box1.axisY);
   const axis1max1 = findMaxWithOffset(box1, hitbox1x, hitbox1y, box1.axisX, box1.axisY);
   const axis1min2 = findMinWithOffset(box2, hitbox2x, hitbox2y, box1.axisX, box1.axisY);
   const axis1max2 = findMaxWithOffset(box2, hitbox2x, hitbox2y, box1.axisX, box1.axisY);
   if (axis1min2 >= axis1max1 || axis1min1 >= axis1max2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis1min1, axis1max1, axis1min2, axis1max2, box1.axisX, box1.axisY);
   
   // Axis 1 complement
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

   // Axis 2 complement
   const axis2ComplementMin1 = findMinWithOffset(box1, hitbox1x, hitbox1y, -box2.axisY, box2.axisX);
   const axis2ComplementMax1 = findMaxWithOffset(box1, hitbox1x, hitbox1y, -box2.axisY, box2.axisX);
   const axis2ComplementMin2 = findMinWithOffset(box2, hitbox2x, hitbox2y, -box2.axisY, box2.axisX);
   const axis2ComplementMax2 = findMaxWithOffset(box2, hitbox2x, hitbox2y, -box2.axisY, box2.axisX);
   if (axis2ComplementMin2 >= axis2ComplementMax1 || axis2ComplementMin1 >= axis2ComplementMax2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis2ComplementMin1, axis2ComplementMax1, axis2ComplementMin2, axis2ComplementMax2, -box2.axisY, box2.axisX);

   const directionVectorX = box2.position.x - box1.position.x;
   const directionVectorY = box2.position.y - box1.position.y;

   if (collisionData.axisX * directionVectorX + collisionData.axisY * directionVectorY > 0) {
      collisionData.axisX = -collisionData.axisX;
      collisionData.axisY = -collisionData.axisY;
   }
   
   // Is colliding!
   collisionData.isColliding = true;
   return collisionData;
}