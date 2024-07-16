import { circlesDoIntersect, circleAndRectangleDoIntersect, rectanglesAreColliding } from "../collision";
import { Point } from "../utils";
import BaseHitbox from "./BaseHitbox";

export const enum HitboxFlags {
   NON_GRASS_BLOCKING = 1 << 0
}

export const enum HitboxCollisionType {
   soft,
   hard
}

export type HitboxVertexPositions = [tl: Point, tr: Point, bl: Point, br: Point];

export class RectangularHitbox extends BaseHitbox {
   public width: number;
   public height: number;
   
   /** The rotation of the hitbox relative to its game object */
   public relativeRotation: number;
   public rotation: number;

   public topLeftVertexOffset = new Point(0, 0);
   public topRightVertexOffset = new Point(0, 0);

   public axisX = 0;
   public axisY = 0;

   constructor(mass: number, offset: Point, collisionType: HitboxCollisionType, collisionBit: number, collisionMask: number, flags: number, width: number, height: number, rotation: number) {
      super(mass, offset, collisionType, collisionBit, collisionMask, flags);

      this.width = width;
      this.height = height;
      this.relativeRotation = rotation;
      this.rotation = rotation;

      updateRotationAndVertexPositionsAndSideAxes(this, 0);
   }

   public calculateHitboxBoundsMinX(): number {
      return this.position.x + Math.min(this.topLeftVertexOffset.x, this.topRightVertexOffset.x, -this.topLeftVertexOffset.x, -this.topRightVertexOffset.x);
   }
   public calculateHitboxBoundsMaxX(): number {
      return this.position.x + Math.max(this.topLeftVertexOffset.x, this.topRightVertexOffset.x, -this.topLeftVertexOffset.x, -this.topRightVertexOffset.x);
   }
   public calculateHitboxBoundsMinY(): number {
      return this.position.y + Math.min(this.topLeftVertexOffset.y, this.topRightVertexOffset.y, -this.topLeftVertexOffset.y, -this.topRightVertexOffset.y);
   }
   public calculateHitboxBoundsMaxY(): number {
      return this.position.y + Math.max(this.topLeftVertexOffset.y, this.topRightVertexOffset.y, -this.topLeftVertexOffset.y, -this.topRightVertexOffset.y);
   }

   public isColliding(otherHitbox: Hitbox, epsilon: number = 0): boolean {
      if (hitboxIsCircular(otherHitbox)) {
         // Circular hitbox
         return circleAndRectangleDoIntersect(otherHitbox.position, otherHitbox.radius - epsilon, this.position, this.width - epsilon * 0.5, this.height - epsilon * 0.5, this.rotation);
      } else {
         // Rectangular hitbox

         const diffX = this.position.x - otherHitbox.position.x;
         const diffY = this.position.y - otherHitbox.position.y;
         
         const width1Squared = this.width * this.width;
         const height1Squared = this.height * this.height;
         const width2Squared = otherHitbox.width * otherHitbox.width;
         const height2Squared = otherHitbox.height * otherHitbox.height;

         // If the distance between the entities is greater than the sum of their half diagonals then they can never collide
         if (diffX * diffX + diffY * diffY > (width1Squared + height1Squared + width2Squared + height2Squared + 2 * Math.sqrt((width1Squared + height1Squared) * (width2Squared + height2Squared))) * 0.25) {
            return false;
         }

         const thisWidthBefore = this.width;
         const thisHeightBefore = this.height;
         
         if (epsilon > 0) {
            this.width -= epsilon * 0.5;
            this.height -= epsilon * 0.5;

            const parentRotation = this.rotation - this.relativeRotation;
            updateRotationAndVertexPositionsAndSideAxes(this, parentRotation);
         }
         
         const collisionData = rectanglesAreColliding(this, otherHitbox, this.position, otherHitbox.position, this.axisX, this.axisY, otherHitbox.axisX, otherHitbox.axisY);

         if (epsilon > 0) {
            this.width = thisWidthBefore;
            this.height = thisHeightBefore;

            const parentRotation = this.rotation - this.relativeRotation;
            updateRotationAndVertexPositionsAndSideAxes(this, parentRotation);
         }
         
         return collisionData.isColliding;
      }
   }
}

export class CircularHitbox extends BaseHitbox {
   public radius: number;

   constructor(mass: number, offset: Point, collisionType: HitboxCollisionType, collisionBit: number, collisionMask: number, flags: number, radius: number) {
      super(mass, offset, collisionType, collisionBit, collisionMask, flags);

      this.radius = radius;
   }

   public calculateHitboxBoundsMinX(): number {
      return this.position.x - this.radius;
   }
   public calculateHitboxBoundsMaxX(): number {
      return this.position.x + this.radius;
   }
   public calculateHitboxBoundsMinY(): number {
      return this.position.y - this.radius;
   }
   public calculateHitboxBoundsMaxY(): number {
      return this.position.y + this.radius;
   }

   public isColliding(otherHitbox: Hitbox, epsilon: number = 0): boolean {
      if (hitboxIsCircular(otherHitbox)) {
         // Circular hitbox
         return circlesDoIntersect(this.position, this.radius - epsilon, otherHitbox.position, otherHitbox.radius - epsilon);
      } else {
         // Rectangular hitbox
         return circleAndRectangleDoIntersect(this.position, this.radius - epsilon, otherHitbox.position, otherHitbox.width - epsilon * 0.5, otherHitbox.height - epsilon * 0.5, otherHitbox.rotation);
      }
   }
}

export type Hitbox = CircularHitbox | RectangularHitbox;

export function hitboxIsCircular(hitbox: Hitbox): hitbox is CircularHitbox {
   return typeof (hitbox as CircularHitbox).radius !== "undefined";
}

export function assertHitboxIsRectangular(hitbox: Hitbox): asserts hitbox is RectangularHitbox {
   if (hitboxIsCircular(hitbox)) {
      throw new Error();
   }
}

const updateRotationAndVertexPositionsAndSideAxes = (hitbox: RectangularHitbox, parentRotation: number): void => {
   const rotation = hitbox.relativeRotation + parentRotation;
   hitbox.rotation = rotation;
   
   const x1 = -hitbox.width * 0.5;
   const x2 = hitbox.width * 0.5;
   const y2 = hitbox.height * 0.5;

   const sinRotation = Math.sin(rotation);
   const cosRotation = Math.cos(rotation);

   // Rotate vertices
   hitbox.topLeftVertexOffset.x = cosRotation * x1 + sinRotation * y2;
   hitbox.topLeftVertexOffset.y = cosRotation * y2 - sinRotation * x1;
   hitbox.topRightVertexOffset.x = cosRotation * x2 + sinRotation * y2;
   hitbox.topRightVertexOffset.y = cosRotation * y2 - sinRotation * x2;

   // Angle between vertex 0 (top left) and vertex 1 (top right)
   // @Speed: If we do a different axis, can we get rid of the minus?
   hitbox.axisX = cosRotation;
   hitbox.axisY = -sinRotation;
}

export function updateHitbox(hitbox: Hitbox, parentX: number, parentY: number, parentRotation: number): void {
   const cosRotation = Math.cos(parentRotation);
   const sinRotation = Math.sin(parentRotation);
   
   hitbox.position.x = parentX + cosRotation * hitbox.offset.x + sinRotation * hitbox.offset.y;
   hitbox.position.y = parentY + cosRotation * hitbox.offset.y - sinRotation * hitbox.offset.x;

   if (!hitboxIsCircular(hitbox)) {
      updateRotationAndVertexPositionsAndSideAxes(hitbox, parentRotation);
   }
}

export function hitboxIsWithinRange(hitbox: Hitbox, position: Point, range: number): boolean {
   if (hitboxIsCircular(hitbox)) {
      // Circular hitbox
      return circlesDoIntersect(position, range, hitbox.position, hitbox.radius);
   } else {
      // Rectangular hitbox
      return circleAndRectangleDoIntersect(position, range, hitbox.position, hitbox.width, hitbox.height, hitbox.rotation);
   }
}