import { getCircleCircleCollisionResult, getCircleRectangleCollisionResult } from "../collision.js";
import { _point, Point, rotatePointAroundOrigin } from "../utils.js";
import { PivotPointType } from "./BaseBox.js";
import { CircularBox } from "./CircularBox.js";
import { RectangularBox } from "./RectangularBox.js";

export const enum HitboxFlag {
   NON_GRASS_BLOCKING,
   // @Cleanup @Speed: This seems like it's central collision logic, perhaps instead change into a "collidesWithWalls" boolean on hitbox objects?
   IGNORES_WALL_COLLISIONS,
   GUARDIAN_LIMB_HITBOX,
   GLURB_TAIL_SEGMENT,
   COW_BODY,
   COW_HEAD,
   YETI_BODY,
   YETI_HEAD,
   OKREN_BODY,
   OKREN_BIG_ARM_SEGMENT,
   OKREN_MEDIUM_ARM_SEGMENT,
   OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION,
   OKREN_EYE,
   OKREN_MANDIBLE,
   OKREN_TONGUE_SEGMENT_MIDDLE,
   OKREN_TONGUE_SEGMENT_TIP,
   KRUMBLID_BODY,
   KRUMBLID_MANDIBLE,
   SNOBE_BODY,
   SNOBE_BUTT,
   SNOBE_EAR,
   INGU_SERPENT_HEAD,
   INGU_SERPENT_BODY_1,
   INGU_SERPENT_BODY_2,
   INGU_SERPENT_TAIL,
   TUKMOK_BODY,
   TUKMOK_HEAD,
   TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL,
   TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM,
   TUKMOK_TAIL_MIDDLE_SEGMENT_BIG,
   TUKMOK_TAIL_CLUB,
   TUKMOK_TRUNK_HEAD,
   TUKMOK_SPUR_HEAD,
   TUKMOK_SPUR_SHOULDER_LEFT_FRONT,
   TUKMOK_SPUR_SHOULDER_LEFT_BACK,
   TUKMOK_SPUR_SHOULDER_RIGHT_FRONT,
   TUKMOK_SPUR_SHOULDER_RIGHT_BACK,
   YETUK_BODY_1,
   YETUK_BODY_2,
   YETUK_BODY_3,
   YETUK_BODY_4,
   YETUK_GLURB_SEGMENT,
   YETUK_MANDIBLE_BIG,
   YETUK_MANDIBLE_MEDIUM,
   YETUK_TRUNK_HEAD,
   YETUK_TRUNK_MIDDLE,
   YETUK_DUSTFLEA_DISPENSION_PORT,
   YETUK_SNOBE_TAIL,
   FENCE_GATE_DOOR,
   FENCE_GATE_SIDE,
   RIVER_STEPPING_STONE_SMALL,
   RIVER_STEPPING_STONE_MEDIUM,
   RIVER_STEPPING_STONE_LARGE,
   HAND
}

export const enum HitboxCollisionType {
   soft,
   hard
}

export const enum BoxType {
   circular,
   rectangular
}

export type Box = CircularBox | RectangularBox;

export type BoxFromType = {
   [BoxType.circular]: CircularBox;
   [BoxType.rectangular]: RectangularBox;
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
   let relativePivotX: number;
   let relativePivotY: number;
   if (box.pivotType === PivotPointType.absolute) {
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

   if (box.totalFlipXMultiplier === -1) {
      rotatedX *= -1;
   }

   return new Point(rotatedX, rotatedY);
}

// @Cleanup: just remove the second parameter and access it through the box's parent property.
export function updateBox(box: Box, parent: Box): void {
   box.totalFlipXMultiplier = (box.flipX ? -1 : 1) * parent.totalFlipXMultiplier;

   box.posX = parent.posX;
   box.posY = parent.posY;
   
   // Now offset from the parent's position based on the hitboxes' offset.
   
   const cosRotation = Math.cos(parent.angle);
   const sinRotation = Math.sin(parent.angle);

   // @Speed: the base offset and pivot offset both scale by flipX independently when they could both be done at once after
   
   let offsetX = box.offsetX * box.scale;
   if (box.totalFlipXMultiplier === -1) {
      offsetX *= -1;
   }
   let offsetY = box.offsetY * box.scale;

   // Now pivot the hitbox around the pivot point based on its relative rotation
   const relativePivotPos = getRelativePivotPos(box, box.relativeAngle);
   const unrotatedRelativePivotPos = getRelativePivotPos(box, 0);
   offsetX -= relativePivotPos.x - unrotatedRelativePivotPos.x;
   offsetY -= relativePivotPos.y - unrotatedRelativePivotPos.y;

   box.posX += cosRotation * offsetX + sinRotation * offsetY;
   box.posY += cosRotation * offsetY - sinRotation * offsetX;
   
   // Update the box's angle
   box.angle = box.relativeAngle * box.totalFlipXMultiplier + parent.angle;

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

export function boxIsWithinRange(box: Box, x: number, y: number, range: number): boolean {
   if (boxIsCircular(box)) {
      // Circular hitbox
      const collisionResult = getCircleCircleCollisionResult(x, y, range, box.posX, box.posY, box.radius * box.scale);
      return collisionResult.isColliding;
   } else {
      // Rectangular hitbox
      const collisionResult = getCircleRectangleCollisionResult(x, y, range, box.posX, box.posY, box.width * box.scale, box.height * box.scale, box.angle);
      return collisionResult.isColliding;
   }
}

export function cloneBox(box: Box): Box {
   if (boxIsCircular(box)) {
      return new CircularBox(box.posX, box.posY, box.offsetX, box.offsetY, box.angle, box.radius);
   }
   return new RectangularBox(box.posX, box.posY, box.offsetX, box.offsetY, box.angle, box.width, box.height);
}

export function getBoxArea(box: Box): number {
   if (boxIsCircular(box)) {
      return Math.PI * box.radius * box.radius;
   } else {
      return box.width * box.height;
   }
}