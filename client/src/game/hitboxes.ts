import { Box, boxIsCircular, HitboxCollisionType, HitboxFlag, Point, randAngle, randFloat, rotatePointAroundOrigin, Settings, Entity, CollisionBit, distance, distBetweenPointAndRectangle, getAngleDiff, getTileIndexIncludingEdges, randSign, _point, Mutable } from "webgl-test-shared";
import { getEntityLayer, getEntityRenderObject } from "./world";
import { registerDirtyRenderObject } from "./rendering/render-part-matrices";
import { Tile } from "./Tile";

export interface HitboxTether {
   readonly originBox: Box;

   readonly idealDistance: number;
   readonly springConstant: number;
   readonly damping: number;
}

export const enum HitboxParentType {
   transformComponent,
   hitbox
}

export interface Hitbox {
   readonly localID: number;

   readonly box: Box;
   
   readonly entity: Entity;
   rootEntity: Entity;

   parent: Hitbox | null;
   
   readonly children: Array<Hitbox>;
   
   readonly previousPosition: Point;
   readonly acceleration: Point;
   readonly tethers: Array<HitboxTether>;

   /** The angle the hitbox had last frame render. Just used to interpolate hitbox rotations. That's why this isn't present in the server definition */
   previousAngle: number;
   previousRelativeAngle: number;
   angularAcceleration: number;

   mass: number;
   collisionType: HitboxCollisionType;
   readonly collisionBit: CollisionBit;
   readonly collisionMask: number;
   readonly flags: ReadonlyArray<HitboxFlag>;

   isPartOfParent: boolean;
   isStatic: boolean;

   lastUpdateTicks: number;
}

export function createHitbox(localID: number, entity: Entity, rootEntity: Entity, parent: Hitbox | null, children: Array<Hitbox>, isPartOfParent: boolean, isStatic: boolean, box: Box, previousPosition: Point, acceleration: Point, tethers: Array<HitboxTether>, previousRelativeAngle: number, angularAcceleration: number, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID,
      entity,
      rootEntity,
      parent,
      children,
      box,
      previousPosition,
      acceleration,
      tethers,
      previousAngle: box.angle,
      previousRelativeAngle,
      angularAcceleration,
      mass,
      collisionType,
      collisionBit,
      collisionMask,
      flags,
      isPartOfParent,
      isStatic,
      // Can't use the current snapshot's tick here cuz what if the hitbox is being created during the creation of the current snapshot! I gotta set it once the hitbox is actually added to the transform component.
      lastUpdateTicks: 0
   };
}

export function createHitboxQuick(entity: Entity, localID: number, parent: Hitbox | null, box: Box, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID,
      entity,
      rootEntity: entity,
      parent,
      isPartOfParent: true,
      isStatic: false,
      children: [],
      box,
      previousPosition: box.position.copy(),
      acceleration: new Point(0, 0),
      tethers: [],
      previousAngle: box.angle,
      previousRelativeAngle: box.relativeAngle,
      angularAcceleration: 0,
      mass,
      collisionType,
      collisionBit,
      collisionMask,
      flags,
      lastUpdateTicks: 0
   };
}

export function getHitboxVelocity(hitbox: Hitbox): void {
   (_point as Mutable<Point>).x = (hitbox.box.position.x - hitbox.previousPosition.x) * Settings.TICK_RATE;
   (_point as Mutable<Point>).y = (hitbox.box.position.y - hitbox.previousPosition.y) * Settings.TICK_RATE;
}

export function setHitboxVelocityX(hitbox: Hitbox, vx: number): void {
   hitbox.previousPosition.x = hitbox.box.position.x - vx * Settings.DT_S;
}

export function setHitboxVelocityY(hitbox: Hitbox, vy: number): void {
   hitbox.previousPosition.y = hitbox.box.position.y - vy * Settings.DT_S;
}

export function setHitboxVelocity(hitbox: Hitbox, vx: number, vy: number): void {
   hitbox.previousPosition.x = hitbox.box.position.x - vx * Settings.DT_S;
   hitbox.previousPosition.y = hitbox.box.position.y - vy * Settings.DT_S;
}

export function getRootHitbox(hitbox: Hitbox): Hitbox {
   let currentHitbox = hitbox;
   while (currentHitbox.parent !== null) {
      currentHitbox = currentHitbox.parent;
   }
   return currentHitbox;
}

export function getHitboxTotalMassIncludingChildren(hitbox: Hitbox): number {
   let totalMass = hitbox.mass;
   // @Cleanup: uses a len hack, but probs wouldn't need to if this wasn't recursive.
   for (let i = 0, len = hitbox.children.length; i < len; i++) {
      const childHitbox = hitbox.children[i];
      if (childHitbox.isPartOfParent) {
         totalMass += getHitboxTotalMassIncludingChildren(childHitbox);
      }
   }
   return totalMass;
}

export function addHitboxVelocity(hitbox: Hitbox, pushX: number, pushY: number): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x += pushX * Settings.DT_S;
   pushedHitbox.box.position.y += pushY * Settings.DT_S;
}

export function translateHitbox(hitbox: Hitbox, translationX: number, translationY: number): void {
   const pushedHitbox = getRootHitbox(hitbox);
   pushedHitbox.box.position.x += translationX;
   pushedHitbox.box.position.y += translationY;
   pushedHitbox.previousPosition.x += translationX;
   pushedHitbox.previousPosition.y += translationY;
}

/** Makes the hitboxes' angle be that as specified, by only changing its relative angle */
export function setHitboxAngle(hitbox: Hitbox, angle: number): void {
   const add = angle - hitbox.box.angle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;

   const renderObject = getEntityRenderObject(hitbox.entity);
   registerDirtyRenderObject(hitbox.entity, renderObject);
}

/** Makes the hitboxes' angle be that as specified, by only changing its relative angle */
export function setHitboxRelativeAngle(hitbox: Hitbox, angle: number): void {
   const add = angle - hitbox.box.relativeAngle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;

   const renderObject = getEntityRenderObject(hitbox.entity);
   registerDirtyRenderObject(hitbox.entity, renderObject);
}

export function applyForce(hitbox: Hitbox, force: Point): void {
   const rootHitbox = getRootHitbox(hitbox);
   if (!rootHitbox.isStatic) {
      const hitboxConnectedMass = getHitboxTotalMassIncludingChildren(rootHitbox);
      if (hitboxConnectedMass !== 0) {
         rootHitbox.acceleration.x += force.x / hitboxConnectedMass;
         rootHitbox.acceleration.y += force.y / hitboxConnectedMass;
      }
   }
}

export function setHitboxObservedAngularVelocity(hitbox: Hitbox, angularVelocity: number): void {
   hitbox.previousRelativeAngle = hitbox.box.angle - angularVelocity * Settings.DT_S;
}

export function getHitboxAngularVelocity(hitbox: Hitbox): number {
   // Here don't use getAngleDiff but just subtract them, so that e.g. adding 2pi to the relative angle will register as some angular velocity
   // @INCOMPLETE @INVESTIGATE but the above comment is wrong??? i do just use getAngleDiff??
   return getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle) * Settings.TICK_RATE;
}
// export function getHitboxRelativeAngularVelocity(hitbox: Hitbox): number {
//    // Here don't use getAngleDiff but just subtract them, so that e.g. adding 2pi to the relative angle will register as some angular velocity
//    // @INCOMPLETE @INVESTIGATE but the above comment is wrong??? i do just use getAngleDiff??
//    return getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle) * Settings.TICK_RATE;
// }

// 
// BEWARE (!!!) Past here goes all the random misc hitbox functions
// 

export function getRandomPositionInBox(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius * Math.random();
      const offsetDirection = randAngle();
      return new Point(box.position.x + offsetMagnitude * Math.sin(offsetDirection), box.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      rotatePointAroundOrigin(xOffset, yOffset, box.angle);
      const x = box.position.x + _point.x;
      const y = box.position.y + _point.y;
      return new Point(x, y);
   }
}

export function getRandomPositionOnBoxEdge(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius;
      const offsetDirection = randAngle();
      return new Point(box.position.x + offsetMagnitude * Math.sin(offsetDirection), box.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      let xOffset: number;
      let yOffset: number;
      if (Math.random() < 0.5) {
         xOffset = randFloat(-halfWidth, halfWidth);
         yOffset = halfHeight * randSign();
      } else {
         xOffset = halfWidth * randSign();
         yOffset = randFloat(-halfHeight, halfHeight);
      }

      rotatePointAroundOrigin(xOffset, yOffset, box.angle);
      const x = box.position.x + _point.x;
      const y = box.position.y + _point.y;
      return new Point(x, y);
   }
}

export function getHitboxTile(hitbox: Hitbox): Tile {
   const tileX = Math.floor(hitbox.box.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.position.y / Settings.TILE_SIZE);
   
   const layer = getEntityLayer(hitbox.entity);
   
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return layer.getTile(tileIndex);
}

export function getHitboxByLocalID(hitboxes: ReadonlyArray<Hitbox>, localID: number): Hitbox | null {
   for (const hitbox of hitboxes) {
      if (hitbox.localID === localID) {
         return hitbox;
      }
   }
   return null;
}

export function getDistanceFromPointToHitbox(point: Readonly<Point>, hitbox: Hitbox): number {
   const box = hitbox.box;
   
   if (boxIsCircular(box)) {
      const rawDistance = distance(point.x, point.y, box.position.x, box.position.y);
      return rawDistance - box.radius;
   } else {
      return distBetweenPointAndRectangle(point.x, point.y, box.position, box.width, box.height, box.angle);
   }
}

export function getDistanceFromPointToHitboxIncludingChildren(point: Readonly<Point>, hitbox: Hitbox): number {
   let minDist = getDistanceFromPointToHitbox(point, hitbox);

   for (const child of hitbox.children) {
      if (child.isPartOfParent) {
         const dist = getDistanceFromPointToHitboxIncludingChildren(point, child);
         if (dist < minDist) {
            minDist = dist;
         }
      }
   }

   return minDist;
}