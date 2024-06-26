import { HitboxVertexPositions } from "./hitboxes/hitboxes";
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

const findMinWithOffset = (vertices: ReadonlyArray<Point>, offsetX: number, offsetY: number, axisX: number, axisY: number): number => {
   const firstVertex = vertices[0];
   let min = axisX * (firstVertex.x + offsetX) + axisY * (firstVertex.y + offsetY);

   for (let i = 1; i < 4; i++) {
      const vertex = vertices[i];
      const dotProduct = axisX * (vertex.x + offsetX) + axisY * (vertex.y + offsetY);
      if (dotProduct < min) {
         min = dotProduct;
      }
   }

   return min;
}

const findMaxWithOffset = (vertices: ReadonlyArray<Point>, offsetX: number, offsetY: number, axisX: number, axisY: number): number => {
   const firstVertex = vertices[0];
   let max = axisX * (firstVertex.x + offsetX) + axisY * (firstVertex.y + offsetY);

   for (let i = 1; i < 4; i++) {
      const vertex = vertices[i];
      const dotProduct = axisX * (vertex.x + offsetX) + axisY * (vertex.y + offsetY);
      if (dotProduct > max) {
         max = dotProduct;
      }
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

export function rectanglesAreColliding(vertexPositions1: HitboxVertexPositions, vertexPositions2: HitboxVertexPositions, offset1: Point, offset2: Point, axis1x: number, axis1y: number, axis2x: number, axis2y: number): CollisionData {
   // @Cleanup: it may be worth switching the axes to Points instead of two numbers for the readability improvement

   // @Incomplete: Collision point
   
   const collisionData: Mutable<CollisionData> = {
      isColliding: false,
      axisX: 0,
      axisY: 0,
      overlap: Number.MAX_SAFE_INTEGER,
      collisionPoint: new Point(0, 0)
   };
   
   // Axis 1
   const axis1min1 = findMinWithOffset(vertexPositions1, offset1.x, offset1.y, axis1x, axis1y);
   const axis1max1 = findMaxWithOffset(vertexPositions1, offset1.x, offset1.y, axis1x, axis1y);
   const axis1min2 = findMinWithOffset(vertexPositions2, offset2.x, offset2.y, axis1x, axis1y);
   const axis1max2 = findMaxWithOffset(vertexPositions2, offset2.x, offset2.y, axis1x, axis1y);
   if (axis1min2 >= axis1max1 || axis1min1 >= axis1max2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis1min1, axis1max1, axis1min2, axis1max2, axis1x, axis1y);
   
   // Axis 1 complement
   const axis1ComplementMin1 = findMinWithOffset(vertexPositions1, offset1.x, offset1.y, -axis1y, axis1x);
   const axis1ComplementMax1 = findMaxWithOffset(vertexPositions1, offset1.x, offset1.y, -axis1y, axis1x);
   const axis1ComplementMin2 = findMinWithOffset(vertexPositions2, offset2.x, offset2.y, -axis1y, axis1x);
   const axis1ComplementMax2 = findMaxWithOffset(vertexPositions2, offset2.x, offset2.y, -axis1y, axis1x);
   if (axis1ComplementMin2 >= axis1ComplementMax1 || axis1ComplementMin1 >= axis1ComplementMax2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis1ComplementMin1, axis1ComplementMax1, axis1ComplementMin2, axis1ComplementMax2, -axis1y, axis1x);
   
   // Axis 2
   const axis2min1 = findMinWithOffset(vertexPositions1, offset1.x, offset1.y, axis2x, axis2y);
   const axis2max1 = findMaxWithOffset(vertexPositions1, offset1.x, offset1.y, axis2x, axis2y);
   const axis2min2 = findMinWithOffset(vertexPositions2, offset2.x, offset2.y, axis2x, axis2y);
   const axis2max2 = findMaxWithOffset(vertexPositions2, offset2.x, offset2.y, axis2x, axis2y);
   if (axis2min2 >= axis2max1 || axis2min1 >= axis2max2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis2min1, axis2max1, axis2min2, axis2max2, axis2x, axis2y);

   // Axis 2 complement
   const axis2ComplementMin1 = findMinWithOffset(vertexPositions1, offset1.x, offset1.y, -axis2y, axis2x);
   const axis2ComplementMax1 = findMaxWithOffset(vertexPositions1, offset1.x, offset1.y, -axis2y, axis2x);
   const axis2ComplementMin2 = findMinWithOffset(vertexPositions2, offset2.x, offset2.y, -axis2y, axis2x);
   const axis2ComplementMax2 = findMaxWithOffset(vertexPositions2, offset2.x, offset2.y, -axis2y, axis2x);
   if (axis2ComplementMin2 >= axis2ComplementMax1 || axis2ComplementMin1 >= axis2ComplementMax2) {
      return collisionData;
   }
   updateMinOverlap(collisionData, axis2ComplementMin1, axis2ComplementMax1, axis2ComplementMin2, axis2ComplementMax2, -axis2y, axis2x);

   const directionVectorX = offset2.x - offset1.x;
   const directionVectorY = offset2.y - offset1.y;

   if (collisionData.axisX * directionVectorX + collisionData.axisY * directionVectorY > 0) {
      collisionData.axisX = -collisionData.axisX;
      collisionData.axisY = -collisionData.axisY;
   }
   
   // Is colliding!
   collisionData.isColliding = true;
   return collisionData;
}