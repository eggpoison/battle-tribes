import { assertBoxIsCircular, assertBoxIsRectangular, Box, boxIsCircular, cloneBox, HitboxCollisionType, HitboxFlag, updateVertexPositionsAndSideAxes, Point, randAngle, randFloat, rotateXAroundOrigin, rotateYAroundOrigin, TILE_PHYSICS_INFO_RECORD, TileType, Settings, PacketReader, Entity, CollisionBit, CircularBox, RectangularBox, distance, distBetweenPointAndRectangle, assert, getAngleDiff } from "webgl-test-shared";
import { hitboxIsInRiver, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getEntityLayer, getEntityRenderInfo } from "./world";
import { registerDirtyRenderInfo } from "./rendering/render-part-matrices";
import { getTileIndexIncludingEdges } from "./Layer";
import { Tile } from "./Tile";
import { readBoxFromData } from "./networking/packet-hitboxes";
import { currentSnapshot } from "./client";

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

const updateCircularBoxFromData = (box: CircularBox, data: CircularBox): void => {
   box.position.x = data.position.x;
   box.position.y = data.position.y;
   box.relativeAngle = data.relativeAngle;
   box.angle = data.angle;
   box.offset.x = data.offset.x;
   box.offset.y = data.offset.y;
   box.pivot.type = data.pivot.type;
   box.pivot.pos.x = data.pivot.pos.x;
   box.pivot.pos.y = data.pivot.pos.y;
   box.scale = data.scale;
   box.flipX = data.flipX;
   box.radius = data.radius;
}

const updateRectangularBoxFromData = (box: RectangularBox, data: RectangularBox): void => {
   box.position.x = data.position.x;
   box.position.y = data.position.y;
   box.relativeAngle = data.relativeAngle;
   box.angle = data.angle;
   box.offset.x = data.offset.x;
   box.offset.y = data.offset.y;
   box.pivot.type = data.pivot.type;
   box.pivot.pos.x = data.pivot.pos.x;
   box.pivot.pos.y = data.pivot.pos.y;
   box.scale = data.scale;
   box.flipX = data.flipX;
   box.width = data.width;
   box.height = data.height;
   
   updateVertexPositionsAndSideAxes(box);
}

export function updateBoxFromData(box: Box, data: Box): void {
   if (boxIsCircular(box)) {
      assertBoxIsCircular(data);
      updateCircularBoxFromData(box, data);
   } else {
      assertBoxIsRectangular(data);
      updateRectangularBoxFromData(box, data);
   }
}

export function createHitbox(localID: number, entity: Entity, rootEntity: Entity, parent: Hitbox | null, children: Array<Hitbox>, isPartOfParent: boolean, isStatic: boolean, box: Box, previousPosition: Point, acceleration: Point, tethers: Array<HitboxTether>, previousRelativeAngle: number, angularAcceleration: number, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID: localID,
      entity: entity,
      rootEntity: rootEntity,
      parent: parent,
      children: children,
      box: box,
      previousPosition: previousPosition,
      acceleration: acceleration,
      tethers: tethers,
      previousAngle: box.angle,
      previousRelativeAngle: previousRelativeAngle,
      angularAcceleration: angularAcceleration,
      mass: mass,
      collisionType: collisionType,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      flags: flags,
      isPartOfParent: isPartOfParent,
      isStatic: isStatic,
      // Can't use the current snapshot's tick here cuz what if the hitbox is being created during the creation of the current snapshot! I gotta set it once the hitbox is actually added to the transform component.
      lastUpdateTicks: 0
   };
}

export function createHitboxQuick(entity: Entity, localID: number, parent: Hitbox | null, box: Box, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number, flags: ReadonlyArray<HitboxFlag>): Hitbox {
   return {
      localID: localID,
      entity: entity,
      rootEntity: entity,
      parent: parent,
      isPartOfParent: true,
      isStatic: false,
      children: [],
      box: box,
      previousPosition: box.position.copy(),
      acceleration: new Point(0, 0),
      tethers: [],
      previousAngle: box.angle,
      previousRelativeAngle: box.relativeAngle,
      angularAcceleration: 0,
      mass: mass,
      collisionType: collisionType,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      flags: flags,
      lastUpdateTicks: 0
   };
}

export function readHitboxFromData(reader: PacketReader, localID: number, entityHitboxes: ReadonlyArray<Hitbox>): Hitbox {
   const box = readBoxFromData(reader);

   const previousPosition = new Point(reader.readNumber(), reader.readNumber());
   const acceleration = new Point(reader.readNumber(), reader.readNumber());

   const tethers = new Array<HitboxTether>();
   const numTethers = reader.readNumber();
   for (let i = 0; i < numTethers; i++) {
      const originBox = readBoxFromData(reader);
      const idealDistance = reader.readNumber();
      const springConstant = reader.readNumber();
      const damping = reader.readNumber();
      const tether: HitboxTether = {
         originBox: originBox,
         idealDistance: idealDistance,
         springConstant: springConstant,
         damping: damping
      };
      tethers.push(tether);
   }
   
   const previousRelativeAngle = reader.readNumber();
   const angularAcceleration = reader.readNumber();
   
   const mass = reader.readNumber();
   const collisionType = reader.readNumber() as HitboxCollisionType;
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();
   
   const numFlags = reader.readNumber();
   const flags = new Array<HitboxFlag>();
   for (let i = 0; i < numFlags; i++) {
      flags.push(reader.readNumber());
   }

   const entity = reader.readNumber();
   const rootEntity = reader.readNumber();

   const parentEntity = reader.readNumber();
   const parentHitboxLocalID = reader.readNumber();

   let parentHitbox: Hitbox | null;
   if (parentEntity === entity) {
      parentHitbox = getHitboxByLocalID(entityHitboxes, parentHitboxLocalID);
   } else {
      parentHitbox = findEntityHitbox(parentEntity, parentHitboxLocalID);
   }

   const children = new Array<Hitbox>();
   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const childEntity = reader.readNumber();
      const childLocalID = reader.readNumber();

      // @BUG: This will often find nothing for the first
      const child = findEntityHitbox(childEntity, childLocalID);
      if (child !== null) {
         children.push(child);
      }
   }

   const isPartOfParent = reader.readBool();
   const isStatic = reader.readBool();

   return createHitbox(localID, entity, rootEntity, parentHitbox, children, isPartOfParent, isStatic, box, previousPosition, acceleration, tethers, previousRelativeAngle, angularAcceleration, mass, collisionType, collisionBit, collisionMask, flags);
}

export function createHitboxFromData(data: Hitbox): Hitbox {
   return createHitbox(data.localID, data.entity, data.rootEntity, data.parent, data.children, data.isPartOfParent, data.isStatic, cloneBox(data.box), data.previousPosition, data.acceleration, data.tethers, data.previousRelativeAngle, data.angularAcceleration, data.mass, data.collisionType, data.collisionBit, data.collisionMask, data.flags);
}

// @Hack this is a lil bit of a hack
export function findEntityHitbox(entity: Entity, localID: number): Hitbox | null {
   const transformComponent = TransformComponentArray.tryGetComponent(entity);
   if (transformComponent === null) {
      return null;
   }
   return getHitboxByLocalID(transformComponent.hitboxes, localID);
}

export function updateHitboxFromData(hitbox: Hitbox, data: Hitbox): void {
   hitbox.previousAngle = hitbox.box.angle;
   
   updateBoxFromData(hitbox.box, data.box);

   hitbox.previousPosition.set(data.previousPosition);
   hitbox.acceleration.set(data.acceleration);

   // Remove all previous tethers and add new ones
   hitbox.tethers.splice(0, hitbox.tethers.length);
   for (const tether of data.tethers) {
      hitbox.tethers.push(tether);
   }

   hitbox.previousRelativeAngle = data.previousRelativeAngle;
   hitbox.angularAcceleration = data.angularAcceleration;
   
   hitbox.mass = data.mass;
   hitbox.collisionType = data.collisionType;

   hitbox.rootEntity = data.rootEntity;
   
   let parentEntity: Entity;
   let parentHitboxLocalID: number;
   if (data.parent !== null) {
      parentEntity = data.parent.entity;
      parentHitboxLocalID = data.parent.localID;
   } else {
      parentEntity = 0;
      parentHitboxLocalID = 0;
   }
   hitbox.parent = findEntityHitbox(parentEntity, parentHitboxLocalID);
   assert(hitbox.parent !== hitbox);

   // @Garbage
   hitbox.children.splice(0, hitbox.children.length);
   for (const childData of data.children) {
      // @BUG: This will often find nothing for the first
      const child = findEntityHitbox(childData.entity, childData.localID);
      if (child !== null) {
         hitbox.children.push(child);
      }
   }

   hitbox.isPartOfParent = data.isPartOfParent;
   hitbox.isStatic = data.isStatic;

   hitbox.lastUpdateTicks = currentSnapshot.tick;
}

export function updatePlayerHitboxFromData(hitbox: Hitbox, data: Hitbox): void {
   hitbox.previousAngle = hitbox.box.angle;
   
   // Remove all previous tethers and add new ones
   hitbox.tethers.splice(0, hitbox.tethers.length);
   for (const tether of data.tethers) {
      hitbox.tethers.push(tether);
   }

   hitbox.rootEntity = data.rootEntity;

   // @Copynpaste
   let parentEntity: Entity;
   let parentHitboxLocalID: number;
   if (data.parent !== null) {
      parentEntity = data.parent.entity;
      parentHitboxLocalID = data.parent.localID;
   } else {
      parentEntity = 0;
      parentHitboxLocalID = 0;
   }
   hitbox.parent = findEntityHitbox(parentEntity, parentHitboxLocalID);
   assert(hitbox.parent !== hitbox);

   // @Garbage
   // @Copynpaste
   hitbox.children.splice(0, hitbox.children.length);
   for (const childData of data.children) {
      // @BUG: This will often find nothing for the first
      const child = findEntityHitbox(childData.entity, childData.localID);
      if (child !== null) {
         hitbox.children.push(child);
      }
   }

   hitbox.lastUpdateTicks = currentSnapshot.tick;
}

export function getHitboxVelocity(hitbox: Hitbox): Point {
   const vx = (hitbox.box.position.x - hitbox.previousPosition.x) * Settings.TICK_RATE;
   const vy = (hitbox.box.position.y - hitbox.previousPosition.y) * Settings.TICK_RATE;
   return new Point(vx, vy);``
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
   for (const childHitbox of hitbox.children) {
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

// @Cleanup: Passing in hitbox really isn't the best, ideally hitbox should self-contain all the necessary info... but is that really good? + memory efficient?
export function applyAccelerationFromGround(hitbox: Hitbox, accelerationX: number, accelerationY: number): void {
   const transformComponent = TransformComponentArray.getComponent(hitbox.entity);

   const tile = getHitboxTile(hitbox);
   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tile.type];
      
   let tileMoveSpeedMultiplier = tilePhysicsInfo.moveSpeedMultiplier;
   if (transformComponent.ignoredTileSpeedMultipliers.includes(tile.type) || (tile.type === TileType.water && !hitboxIsInRiver(hitbox))) {
      tileMoveSpeedMultiplier = 1;
   }
   
   // Calculate the desired velocity based on acceleration
   const friction = tilePhysicsInfo.friction;
   const desiredVelocityX = accelerationX * friction * tileMoveSpeedMultiplier;
   const desiredVelocityY = accelerationY * friction * tileMoveSpeedMultiplier;

   const currentVelocity = getHitboxVelocity(hitbox);
   
   // Apply velocity with traction (blend towards desired velocity)
   hitbox.acceleration.x += (desiredVelocityX - currentVelocity.x) * transformComponent.traction;
   hitbox.acceleration.y += (desiredVelocityY - currentVelocity.y) * transformComponent.traction;
}

/** Makes the hitboxes' angle be that as specified, by only changing its relative angle */
export function setHitboxAngle(hitbox: Hitbox, angle: number): void {
   const add = angle - hitbox.box.angle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;

   const renderInfo = getEntityRenderInfo(hitbox.entity);
   registerDirtyRenderInfo(renderInfo);
}

/** Makes the hitboxes' angle be that as specified, by only changing its relative angle */
export function setHitboxRelativeAngle(hitbox: Hitbox, angle: number): void {
   const add = angle - hitbox.box.relativeAngle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;

   const renderInfo = getEntityRenderInfo(hitbox.entity);
   registerDirtyRenderInfo(renderInfo);
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

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.angle);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.angle);
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

export function getDistanceFromPointToEntity(point: Readonly<Point>, entity: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const hitbox of transformComponent.hitboxes) {
      const dist = getDistanceFromPointToHitboxIncludingChildren(point, hitbox);
      if (dist < minDist) {
         minDist = dist;
      }
   }
   return minDist;
}