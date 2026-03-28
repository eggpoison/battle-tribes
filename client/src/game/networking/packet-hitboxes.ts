import { Point, PacketReader, Box, CircularBox, RectangularBox, PivotPointType, assert, Entity, boxIsCircular, assertBoxIsCircular, assertBoxIsRectangular, updateSideAxes, HitboxCollisionType, HitboxFlag, cloneBox } from "webgl-test-shared";
import { currentSnapshot } from "../game";
import { Hitbox, HitboxTether, createHitbox, getHitboxByLocalID } from "../hitboxes";
import { findEntityHitbox } from "../entity-components/server-components/TransformComponent";

const readCircularBoxFromData = (reader: PacketReader): CircularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
   // @Bandwidth do we need the server to send this? Or can we infer it from the relative angle tree? This hinges on whether we can have a hitbox child exist without knowing about its parent.
   const angle = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const pivotType = reader.readNumber() as PivotPointType;
   const pivotPosX = reader.readNumber();
   const pivotPosY = reader.readNumber();
   const scale = reader.readNumber();
   const flipX = reader.readBool();

   const radius = reader.readNumber();

   const box = new CircularBox(new Point(x, y), new Point(offsetX, offsetY), relativeAngle, radius);
   box.angle = angle;
   box.pivot = {
      type: pivotType,
      pos: new Point(pivotPosX, pivotPosY)
   };
   box.scale = scale;
   box.flipX = flipX;
   return box;
}
const padCircularBoxData = (reader: PacketReader): void => {
   reader.padOffset(12 * Float32Array.BYTES_PER_ELEMENT);
}

const readRectangularBoxFromData = (reader: PacketReader): RectangularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
   // @Bandwidth do we need the server to send this? Or can we infer it from the relative angle tree? This hinges on whether we can have a hitbox child exist without knowing about its parent.
   const angle = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const pivotType = reader.readNumber() as PivotPointType;
   const pivotPosX = reader.readNumber();
   const pivotPosY = reader.readNumber();
   const scale = reader.readNumber();
   const flipX = reader.readBool();

   const width = reader.readNumber();
   const height = reader.readNumber();

   const box = new RectangularBox(new Point(x, y), new Point(offsetX, offsetY), relativeAngle, width, height);
   box.angle = angle;
   box.pivot = {
      type: pivotType,
      pos: new Point(pivotPosX, pivotPosY)
   };
   box.scale = scale;
   box.flipX = flipX;
   return box;
}
const padRectangularBoxData = (reader: PacketReader): void => {
   reader.padOffset(13 * Float32Array.BYTES_PER_ELEMENT);
}

export function readBoxFromData(reader: PacketReader): Box {
   const isCircular = reader.readBool();
   if (isCircular) {
      return readCircularBoxFromData(reader);
   } else {
      return readRectangularBoxFromData(reader);
   }
}
export function padBoxData(reader: PacketReader): void {
   const isCircular = reader.readBool();
   if (isCircular) {
      padCircularBoxData(reader);
   } else {
      padRectangularBoxData(reader);
   }
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
   updateSideAxes(box);
}

const updateBoxFromData = (box: Box, data: Box): void => {
   if (boxIsCircular(box)) {
      assertBoxIsCircular(data);
      updateCircularBoxFromData(box, data);
   } else {
      assertBoxIsRectangular(data);
      updateRectangularBoxFromData(box, data);
   }
}

export function updateHitboxFromData(hitbox: Hitbox, data: Hitbox): void {
   hitbox.previousAngle = hitbox.box.angle;
   
   updateBoxFromData(hitbox.box, data.box);

   hitbox.previousPosition.set(data.previousPosition);
   hitbox.acceleration.set(data.acceleration);

   // Remove all previous tethers and add new ones
   // @Speed
   hitbox.tethers.length = 0;
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
   hitbox.children.length = 0;
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
   hitbox.tethers.length = 0;
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
   hitbox.children.length = 0;
   for (const childData of data.children) {
      // @BUG: This will often find nothing for the first
      const child = findEntityHitbox(childData.entity, childData.localID);
      if (child !== null) {
         hitbox.children.push(child);
      }
   }

   hitbox.lastUpdateTicks = currentSnapshot.tick;
}