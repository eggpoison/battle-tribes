import { CollisionResult, getCircleCircleCollisionResult, getCircleRectangleCollisionResult, rectanglesAreColliding } from "./collision.js";
import { _point, Point, rotatePointAroundOrigin } from "./utils.js";

export const enum HitboxFlagBit {
   COLLISION_TYPE_BIT = 1 << 0,
   IS_STATIC_BIT = 1 << 1,
   IS_PART_OF_PARENT_BIT = 1 << 2,
   NON_GRASS_BLOCKING_BIT = 1 << 3,
   IGNORES_WALL_COLLISIONS_BIT = 1 << 4
}

export const enum HitboxTag {
   none,
   guardianLimbHitbox,
   glurbTailSegment,
   cowBody,
   cowHead,
   yetiBody,
   yetiHead,
   okrenBody,
   okrenBigArmSegment,
   okrenMediumArmSegment,
   okrenArmSegmentOfSlashingAndDestruction,
   okrenEye,
   okrenMandible,
   okrenTongueSegmentMiddle,
   okrenTongueSegmentTip,
   krumblidBody,
   krumblidMandible,
   snobeBody,
   snobeButt,
   snobeEar,
   inguSerpentHead,
   inguSerpentBody1,
   inguSerpentBody2,
   inguSerpentTail,
   tukmokBody,
   tukmokHead,
   tukmokTailMiddleSegmentSmall,
   tukmokTailMiddleSegmentMedium,
   tukmokTailMiddleSegmentBig,
   tukmokTailClub,
   tukmokTrunkHead,
   tukmokSpurHead,
   tukmokSpurShoulderLeftFront,
   tukmokSpurShoulderLeftBack,
   tukmokSpurShoulderRightFront,
   tukmokSpurShoulderRightBack,
   yetukBody1,
   yetukBody2,
   yetukBody3,
   yetukBody4,
   yetukGlurbSegment,
   yetukMandibleBig,
   yetukMandibleMedium,
   yetukTrunkHead,
   yetukTrunkMiddle,
   yetukDustfleaDispensionPort,
   yetukSnobeTail,
   fenceGateDoor,
   fenceGateSide,
   riverSteppingStoneSmall,
   riverSteppingStoneMedium,
   riverSteppingStoneLarge,
   hand
}

export const enum HitboxCollisionType {
   soft,
   hard
}

export const enum BoxType {
   circular,
   rectangular
}

export const enum PivotPointType {
   // @Cleanup: normalised is the wrong kind of term I feel]
   /** Coordinates taken as an offset from the hitboxes' position. */
   absolute,
   /** Coordinates normalised to the hitboxes' size. (-0.5, -0.5) = bottom left, (0, 0) = middle, (0.5, 0.5) = top right */
   normalised
}

interface BaseBox {
   // @CLEANUP i should really make this only able to be manipulated through some supplied functions, so places can't mistakenly manipulate it thinking they're being correct
   posX: number;
   posY: number;
   // Offset of the box from its parent. If on a root hitbox of a base entity, does nothing. */
   offsetX: number;
   offsetY: number;
   
   // Point from which rotation is applied relative to.
   pivotX: number;
   pivotY: number;

   relativeAngle: number;
   /** Angle the hitbox is facing, taken counterclockwise from the positive x axis (radians) */
   angle: number;

   /** First bit = flipX, second bit = pivotType. */
   flags: number;
}

export interface CircularBox extends BaseBox {
   radius: number;
}

export interface RectangularBox extends BaseBox {
   width: number;
   height: number;

   axisX: number;
   axisY: number;
}

export type Box = CircularBox | RectangularBox;

export type BoxFromType = {
   [BoxType.circular]: CircularBox;
   [BoxType.rectangular]: RectangularBox;
}

export const _bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

export function createCircularBox(posX: number, posY: number, offsetX: number, offsetY: number, angle: number, radius: number): CircularBox {
   return {
      posX,
      posY,
      offsetX,
      offsetY,
      pivotX: 0,
      pivotY: 0,
      angle: angle,
      relativeAngle: angle,
      flags: 0,
      radius: radius
   };
}

export function createRectangularBox(posX: number, posY: number, offsetX: number, offsetY: number, angle: number, width: number, height: number): RectangularBox {
   const box: RectangularBox = {
      posX,
      posY,
      offsetX,
      offsetY,
      pivotX: 0,
      pivotY: 0,
      angle: angle,
      relativeAngle: angle,
      flags: 0,
      width,
      height,
      axisX: 0,
      axisY: 0
   };
   updateSideAxes(box);
   return box;
}

export function boxIsCircular(box: Box): box is CircularBox {
   return (box as CircularBox).radius !== undefined;
}

export function assertBoxIsCircular(box: Box): asserts box is CircularBox {
   if (!boxIsCircular(box)) {
      throw new Error();
   }
}

export function assertBoxIsRectangular(box: Box): asserts box is RectangularBox {
   if (boxIsCircular(box)) {
      throw new Error();
   }
}

export function setBoxFlipX(box: Box, flipX: boolean): void {
   box.flags = (box.flags & ~1) | (flipX ? 1 : 0);
}

export function getBoxFlipX(box: Box): boolean {
   return box.flags & 1 ? true : false;
}

export function setBoxPivotType(box: Box, pivotType: PivotPointType): void {
   box.flags = (box.flags & ~2) | (pivotType << 1);
}

export function updateSideAxes(box: RectangularBox): void {
   const rotation = box.angle;
   const sinRotation = Math.sin(rotation);
   const cosRotation = Math.cos(rotation);

   // Angle between vertex 0 (top left) and vertex 1 (top right)
   // @Speed: If we do a different axis, can we get rid of the minus?
   box.axisX = cosRotation;
   box.axisY = -sinRotation;
}

export function getRelativePivotPos(box: Box, angle: number): Point {
   const pivotType: PivotPointType = box.flags & 2;
   
   let relativePivotX: number;
   let relativePivotY: number;
   if (pivotType === PivotPointType.absolute) {
      // Absolute
      relativePivotX = box.pivotX;
      relativePivotY = box.pivotY;
   } else {
      // Normalised
      
      let width: number;
      let height: number;
      if (boxIsCircular(box)) {
         width = box.radius * 2;
         height = box.radius * 2;
      } else {
         width = box.width;
         height = box.height;
      }
      
      relativePivotX = box.pivotX * width;
      relativePivotY = box.pivotY * height;
   }

   rotatePointAroundOrigin(relativePivotX, relativePivotY, angle);
   let rotatedX = _point.x;
   let rotatedY = _point.y;

   if (box.flags & 1) {
      rotatedX *= -1;
   }

   return new Point(rotatedX, rotatedY);
}

// @Cleanup: just remove the second parameter and access it through the box's parent property.
export function updateBox(box: Box, parent: Box): void {
   box.posX = parent.posX;
   box.posY = parent.posY;
   
   // Now offset from the parent's position based on the hitboxes' offset.
   
   const cosRotation = Math.cos(parent.angle);
   const sinRotation = Math.sin(parent.angle);

   // @Speed: the base offset and pivot offset both scale by flipX independently when they could both be done at once after
   
   let offsetX = box.offsetX;
   if (box.flags & 1) {
      offsetX *= -1;
   }
   let offsetY = box.offsetY;

   // Now pivot the hitbox around the pivot point based on its relative rotation
   // @Garbage
   const rotatedRelativePivotPos = getRelativePivotPos(box, box.relativeAngle);
   const unrotatedRelativePivotPos = getRelativePivotPos(box, 0);
   offsetX -= rotatedRelativePivotPos.x - unrotatedRelativePivotPos.x;
   offsetY -= rotatedRelativePivotPos.y - unrotatedRelativePivotPos.y;

   box.posX += cosRotation * offsetX + sinRotation * offsetY;
   box.posY += cosRotation * offsetY - sinRotation * offsetX;
   
   // Update the box's angle
   box.angle = box.relativeAngle * ((box.flags & 1) ? -1 : 1) + parent.angle;

   // const pivotPointX = box.position.x + relativePivotPos.x - unrotatedRelativePivotPos.x;
   // const pivotPointY = box.position.y + relativePivotPos.y - unrotatedRelativePivotPos.y;

   // const preX = box.position.x;
   // const preY = box.position.y;
   // box.position.x = rotateXAroundPoint(preX, preY, pivotPointX, pivotPointY, box.relativeAngle * box.totalFlipXMultiplier);
   // box.position.y = rotateYAroundPoint(preX, preY, pivotPointX, pivotPointY, box.relativeAngle * box.totalFlipXMultiplier);

   if (!boxIsCircular(box)) {
      updateSideAxes(box);
   }
}

export function calculateRectangularBoxBounds(box: RectangularBox): void {
   const xxa = box.axisX * box.width;
   const xya = box.axisY * box.height;
   const halfX = Math.max(Math.abs(xxa + xya), Math.abs(xxa - xya)) * 0.5;

   const yxa = box.axisX * box.height;
   const yya = box.axisY * box.width;
   const halfY = Math.max(Math.abs(yxa - yya), Math.abs(yxa + yya)) * 0.5;

   const x = box.posX;
   const y = box.posY;
   _bounds.minX = x - halfX;
   _bounds.maxX = x + halfX;
   _bounds.minY = y - halfY;
   _bounds.maxY = y + halfY;
}

export function calculateCircularBoxBounds(box: CircularBox): void {
   _bounds.minX = box.posX - box.radius;
   _bounds.maxX = box.posX + box.radius;
   _bounds.minY = box.posY - box.radius;
   _bounds.maxY = box.posY + box.radius;
}

export function calculateBoxBounds(box: Box): void {
   if (boxIsCircular(box)) {
      calculateCircularBoxBounds(box);
   } else {
      calculateRectangularBoxBounds(box);
   }
}

// // @Hack
export function getRectangularBoxTopLeftVertexOffset(box: RectangularBox): Point {
   const tlX = (box.axisX * -box.width - box.axisY * box.height) * 0.5;
   const tlY = (box.axisX * box.height + box.axisY * -box.width) * 0.5;
   return new Point(tlX, tlY);
}

// // @Hack
export function getRectangularBoxTopRightVertexOffset(box: RectangularBox): Point {
   const tlX = (box.axisX * box.width - box.axisY * box.height) * 0.5;
   const tlY = (box.axisX * box.height + box.axisY * box.width) * 0.5;
   return new Point(tlX, tlY);
}

export function getCircularBoxCollisionResult(box: CircularBox, otherBox: Box, epsilon: number = 0): CollisionResult {
   if (boxIsCircular(otherBox)) {
      // Circular otherBox
      return getCircleCircleCollisionResult(box.posX, box.posY, box.radius - epsilon, otherBox.posX, otherBox.posY, otherBox.radius - epsilon);
   } else {
      // Rectangular otherBox
      return getCircleRectangleCollisionResult(box.posX, box.posY, box.radius - epsilon, otherBox.posX, otherBox.posY, otherBox.width - epsilon * 0.5, otherBox.height - epsilon * 0.5, otherBox.angle);
   }
}

export function getRectangularBoxCollisionResult(box: RectangularBox, otherHitbox: Box, epsilon: number = 0): CollisionResult {
   if (boxIsCircular(otherHitbox)) {
      // Circular hitbox
      const collisionResult = getCircleRectangleCollisionResult(otherHitbox.posX, otherHitbox.posY, otherHitbox.radius - epsilon, box.posX, box.posY, box.width - epsilon * 0.5, box.height - epsilon * 0.5, box.angle);
      collisionResult.overlap.x *= -1;
      collisionResult.overlap.y *= -1;
      return collisionResult;
   } else {
      // Rectangular hitbox

      const diffX = box.posX - otherHitbox.posX;
      const diffY = box.posY - otherHitbox.posY;
      
      const width1Squared = box.width * box.width;
      const height1Squared = box.height * box.height;
      // @Incomplete: doesn't account for scale?
      const width2Squared = otherHitbox.width * otherHitbox.width;
      const height2Squared = otherHitbox.height * otherHitbox.height;

      // If the distance between the entities is greater than the sum of their half diagonals then they can never collide
      if (diffX * diffX + diffY * diffY > (width1Squared + height1Squared + width2Squared + height2Squared + 2 * Math.sqrt((width1Squared + height1Squared) * (width2Squared + height2Squared))) * 0.25) {
         return {
            isColliding: false,
            overlap: new Point(0, 0),
            collisionPoint: new Point(0, 0)
         };
      }

      const thisWidthBefore = box.width;
      const thisHeightBefore = box.height;
      
      if (epsilon > 0) {
         box.width -= epsilon * 0.5;
         box.height -= epsilon * 0.5;
      }
      
      const collisionResult = rectanglesAreColliding(box, otherHitbox);

      if (epsilon > 0) {
         box.width = thisWidthBefore;
         box.height = thisHeightBefore;
      }
      
      return collisionResult;
   }
}

export function getBoxCollisionResult(box: Box, otherBox: Box, epsilon: number = 0): CollisionResult {
   if (boxIsCircular(box)) {
      return getCircularBoxCollisionResult(box, otherBox, epsilon);
   }
   return getRectangularBoxCollisionResult(box, otherBox, epsilon);
}

export function boxIsWithinRange(box: Box, x: number, y: number, range: number): boolean {
   if (boxIsCircular(box)) {
      // Circular hitbox
      const collisionResult = getCircleCircleCollisionResult(x, y, range, box.posX, box.posY, box.radius);
      return collisionResult.isColliding;
   } else {
      // Rectangular hitbox
      const collisionResult = getCircleRectangleCollisionResult(x, y, range, box.posX, box.posY, box.width, box.height, box.angle);
      return collisionResult.isColliding;
   }
}

export function cloneBox(box: Box): Box {
   if (boxIsCircular(box)) {
      return createCircularBox(box.posX, box.posY, box.offsetX, box.offsetY, box.angle, box.radius);
   }
   return createRectangularBox(box.posX, box.posY, box.offsetX, box.offsetY, box.angle, box.width, box.height);
}

export function getBoxArea(box: Box): number {
   if (boxIsCircular(box)) {
      return Math.PI * box.radius * box.radius;
   } else {
      return box.width * box.height;
   }
}

export function circleCollidesWithBox(x: number, y: number, radius: number, box: Box): boolean {
   if (boxIsCircular(box)) {
      return getCircleCircleCollisionResult(x, y, radius, box.posX, box.posY, box.radius).isColliding;
   } else {
      return getCircleRectangleCollisionResult(x, y, radius, box.posX, box.posY, box.width, box.height, box.angle).isColliding;
   }
}