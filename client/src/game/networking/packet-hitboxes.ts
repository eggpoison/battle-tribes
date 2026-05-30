import { PacketReader } from "../../../../shared/src/packets";
import { assertBoxIsCircular, assertBoxIsRectangular, Box, boxIsCircular, CircularBox, cloneBox, createCircularBox, createRectangularBox, RectangularBox, updateSideAxes } from "../../../../shared/src/boxes";
import { Entity } from "../../../../shared/src/entities";
import { assert } from "../../../../shared/src/utils";
import { currentSnapshot } from "../networking/snapshots";
import { Hitbox, HitboxTether, createHitbox, getHitboxByLocalID } from "../hitboxes";
import { findEntityHitbox } from "../entity-components/server-components/TransformComponent";
import { Bytes } from "../../../../shared/src/constants";

const readCircularBoxFromData = (reader: PacketReader): CircularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
   // @Bandwidth do we need the server to send this? Or can we infer it from the relative angle tree? This hinges on whether we can have a hitbox child exist without knowing about its parent.
   const angle = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const pivotPosX = reader.readNumber();
   const pivotPosY = reader.readNumber();
   const flags = reader.readNumber();

   const radius = reader.readNumber();

   const box = createCircularBox(x, y, offsetX, offsetY, relativeAngle, radius);
   box.angle = angle;
   box.pivotX = pivotPosX;
   box.pivotY = pivotPosY;
   box.flags = flags;
   return box;
}
const padCircularBoxData = (reader: PacketReader): void => {
   reader.padOffset(10 * Bytes.Float32);
}

const readRectangularBoxFromData = (reader: PacketReader): RectangularBox => {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const relativeAngle = reader.readNumber();
   // @Bandwidth do we need the server to send this? Or can we infer it from the relative angle tree? This hinges on whether we can have a hitbox child exist without knowing about its parent.
   const angle = reader.readNumber();
   const offsetX = reader.readNumber();
   const offsetY = reader.readNumber();
   const pivotPosX = reader.readNumber();
   const pivotPosY = reader.readNumber();
   const flags = reader.readNumber();

   const width = reader.readNumber();
   const height = reader.readNumber();

   const box = createRectangularBox(x, y, offsetX, offsetY, relativeAngle, width, height);
   box.angle = angle;
   box.pivotX = pivotPosX;
   box.pivotY = pivotPosY;
   box.flags = flags;
   return box;
}
const padRectangularBoxData = (reader: PacketReader): void => {
   reader.padOffset(11 * Bytes.Float32);
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

   const previousPosX = reader.readNumber();
   const previousPosY = reader.readNumber();
   const accelX = reader.readNumber();
   const accelY = reader.readNumber();

   const tethers: Array<HitboxTether> = [];
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
   const collisionBit = reader.readNumber();
   const collisionMask = reader.readNumber();
   
   const flags = reader.readNumber();

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

   const children: Array<Hitbox> = [];
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

   return createHitbox(localID, entity, rootEntity, parentHitbox, children, box, previousPosX, previousPosY, accelX, accelY, tethers, previousRelativeAngle, angularAcceleration, mass, collisionBit, collisionMask, flags);
}

export function createHitboxFromData(data: Hitbox): Hitbox {
   return createHitbox(data.localID, data.entity, data.rootEntity, data.parent, data.children, cloneBox(data.box), data.previousPosX, data.previousPosY, data.accelX, data.accelY, data.tethers, data.previousRelativeAngle, data.angularAcceleration, data.mass, data.collisionBit, data.collisionMask, data.flags);
}

const updateCircularBoxFromData = (box: CircularBox, data: CircularBox): void => {
   box.posX = data.posX;
   box.posY = data.posY;
   box.relativeAngle = data.relativeAngle;
   box.angle = data.angle;
   box.offsetX = data.offsetX;
   box.offsetY = data.offsetY;
   box.pivotX = data.pivotX;
   box.pivotY = data.pivotY;
   box.flags = data.flags;
   box.radius = data.radius;
}

const updateRectangularBoxFromData = (box: RectangularBox, data: RectangularBox): void => {
   box.posX = data.posX;
   box.posY = data.posY;
   box.relativeAngle = data.relativeAngle;
   box.angle = data.angle;
   box.offsetX = data.offsetX;
   box.offsetY = data.offsetY;
   box.pivotX = data.pivotX;
   box.pivotY = data.pivotY;
   box.flags = data.flags;
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

   hitbox.previousPosX = data.previousPosX;
   hitbox.previousPosY = data.previousPosY;
   hitbox.accelX = data.accelX;
   hitbox.accelY = data.accelY;

   // Remove all previous tethers and add new ones
   // @Speed
   hitbox.tethers.length = 0;
   for (const tether of data.tethers) {
      hitbox.tethers.push(tether);
   }

   hitbox.previousRelativeAngle = data.previousRelativeAngle;
   hitbox.angularAcceleration = data.angularAcceleration;
   
   hitbox.mass = data.mass;

   hitbox.rootEntity = data.rootEntity;

   hitbox.flags = data.flags;
   
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