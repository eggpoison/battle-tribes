import { getCircleCircleCollisionResult, getCircleRectangleCollisionResult } from "../collision";
import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "../utils";
import { PivotPointType } from "./BaseBox";
import { CircularBox } from "./CircularBox";
import { RectangularBox } from "./RectangularBox";

export enum HitboxFlag {
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
}

export enum HitboxCollisionType {
   soft,
   hard
}

export enum BoxType {
   circular,
   rectangular
}

export type Box = CircularBox | RectangularBox;

export type BoxFromType = {
   [BoxType.circular]: CircularBox;
   [BoxType.rectangular]: RectangularBox;
}

export function boxIsCircular(box: Box): box is CircularBox {
   return typeof (box as CircularBox).radius !== "undefined";
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

export function updateVertexPositionsAndSideAxes(box: RectangularBox): void {
   const x1 = -box.width * box.scale * 0.5;
   const x2 = box.width * box.scale * 0.5;
   const y2 = box.height * box.scale * 0.5;

   const rotation = box.angle;
   const sinRotation = Math.sin(rotation);
   const cosRotation = Math.cos(rotation);

   // Rotate vertices
   box.topLeftVertexOffset.x = cosRotation * x1 + sinRotation * y2;
   box.topLeftVertexOffset.y = cosRotation * y2 - sinRotation * x1;
   box.topRightVertexOffset.x = cosRotation * x2 + sinRotation * y2;
   box.topRightVertexOffset.y = cosRotation * y2 - sinRotation * x2;

   // Angle between vertex 0 (top left) and vertex 1 (top right)
   // @Speed: If we do a different axis, can we get rid of the minus?
   box.axisX = cosRotation;
   box.axisY = -sinRotation;
}

export function getRelativePivotPos(box: Box, angle: number): Point {
   let relativePivotX: number;
   let relativePivotY: number;
   if (box.pivot.type === PivotPointType.absolute) {
      // Absolute
      relativePivotX = box.pivot.pos.x;
      relativePivotY = box.pivot.pos.y;
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
      
      relativePivotX = box.pivot.pos.x * width;
      relativePivotY = box.pivot.pos.y * height;
   }

   let rotatedX = rotateXAroundOrigin(relativePivotX, relativePivotY, angle);
   let rotatedY = rotateYAroundOrigin(relativePivotX, relativePivotY, angle);

   if (box.totalFlipXMultiplier === -1) {
      rotatedX *= -1;
   }

   return new Point(rotatedX, rotatedY);
}

// @Cleanup: just remove the second parameter and access it through the box's parent property.
export function updateBox(box: Box, parent: Box): void {
   box.totalFlipXMultiplier = (box.flipX ? -1 : 1) * parent.totalFlipXMultiplier;

   box.position.x = parent.position.x;
   box.position.y = parent.position.y;
   
   // Now offset from the parent's position based on the hitboxes' offset.
   
   const cosRotation = Math.cos(parent.angle);
   const sinRotation = Math.sin(parent.angle);

   // @Speed: the base offset and pivot offset both scale by flipX independently when they could both be done at once after
   
   let offsetX = box.offset.x * box.scale;
   if (box.totalFlipXMultiplier === -1) {
      offsetX *= -1;
   }
   let offsetY = box.offset.y * box.scale;

   // Now pivot the hitbox around the pivot point based on its relative rotation
   const relativePivotPos = getRelativePivotPos(box, box.relativeAngle);
   const unrotatedRelativePivotPos = getRelativePivotPos(box, 0);
   offsetX -= relativePivotPos.x - unrotatedRelativePivotPos.x;
   offsetY -= relativePivotPos.y - unrotatedRelativePivotPos.y;

   box.position.x += cosRotation * offsetX + sinRotation * offsetY;
   box.position.y += cosRotation * offsetY - sinRotation * offsetX;
   
   // Update the box's angle
   box.angle = box.relativeAngle * box.totalFlipXMultiplier + parent.angle;

   // const pivotPointX = box.position.x + relativePivotPos.x - unrotatedRelativePivotPos.x;
   // const pivotPointY = box.position.y + relativePivotPos.y - unrotatedRelativePivotPos.y;

   // const preX = box.position.x;
   // const preY = box.position.y;
   // box.position.x = rotateXAroundPoint(preX, preY, pivotPointX, pivotPointY, box.relativeAngle * box.totalFlipXMultiplier);
   // box.position.y = rotateYAroundPoint(preX, preY, pivotPointX, pivotPointY, box.relativeAngle * box.totalFlipXMultiplier);

   if (!boxIsCircular(box)) {
      updateVertexPositionsAndSideAxes(box);
   }
}

export function boxIsWithinRange(box: Box, position: Point, range: number): boolean {
   if (boxIsCircular(box)) {
      // Circular hitbox
      const collisionResult = getCircleCircleCollisionResult(position, range, box.position, box.radius * box.scale);
      return collisionResult.isColliding;
   } else {
      // Rectangular hitbox
      const collisionResult = getCircleRectangleCollisionResult(position, range, box.position, box.width * box.scale, box.height * box.scale, box.angle);
      return collisionResult.isColliding;
   }
}

export function cloneBox(box: Box): Box {
   if (boxIsCircular(box)) {
      return new CircularBox(box.position.copy(), box.offset.copy(), box.angle, box.radius);
   } else {
      return new RectangularBox(box.position.copy(), box.offset.copy(), box.angle, box.width, box.height);
   }
}

export function getBoxArea(box: Box): number {
   if (boxIsCircular(box)) {
      return Math.PI * box.radius * box.radius;
   } else {
      return box.width * box.height;
   }
}