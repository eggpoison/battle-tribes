import { Box, CircularBox, RectangularBox, boxIsCircular } from "../../../shared/dist/boxes.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Hitbox } from "../hitboxes.js";
import { getHitboxTethers } from "../tethers.js";

const addBaseBoxData = (packet: Packet, box: Box): void => {
   packet.writeNumber(box.posX);
   packet.writeNumber(box.posY);
   packet.writeNumber(box.relativeAngle);
   packet.writeNumber(box.angle);
   packet.writeNumber(box.offsetX);
   packet.writeNumber(box.offsetY);

   packet.writeNumber(box.pivotX);
   packet.writeNumber(box.pivotY);
   
   packet.writeNumber(box.flags);
}
const getBaseBoxDataLength = (): number => {
   return 9 * Bytes.Float32;
}

const addCircularBoxData = (packet: Packet, box: CircularBox): void => {
   addBaseBoxData(packet, box);
   packet.writeNumber(box.radius);
}
const getCircularBoxDataLength = (): number => {
   return getBaseBoxDataLength() + Bytes.Float32;
}

const addRectangularBoxData = (packet: Packet, box: RectangularBox): void => {
   addBaseBoxData(packet, box);
   packet.writeNumber(box.width);
   packet.writeNumber(box.height);
}
const getRectangularBoxDataLength = (): number => {
   return getBaseBoxDataLength() + 2 * Bytes.Float32;
}

export function addBoxDataToPacket(packet: Packet, box: Box): void {
   const isCircular = boxIsCircular(box);
   
   packet.writeBool(isCircular);
   if (isCircular) {
      addCircularBoxData(packet, box);
   } else {
      addRectangularBoxData(packet, box);
   }
}
export function getBoxDataLength(box: Box): number {
   let lengthBytes = Bytes.Float32;
   if (boxIsCircular(box)) {
      lengthBytes += getCircularBoxDataLength();
   } else {
      lengthBytes += getRectangularBoxDataLength();
   }
   return lengthBytes;
}

export function addHitboxDataToPacket(packet: Packet, hitbox: Hitbox): void {
   // Important that local ID is first (see how the client uses it when updating from data)
   packet.writeNumber(hitbox.localID);

   addBoxDataToPacket(packet, hitbox.box);

   packet.writeNumber(hitbox.previousPosX);
   packet.writeNumber(hitbox.previousPosY);
   packet.writeNumber(hitbox.accelX);
   packet.writeNumber(hitbox.accelY);

   // Tethers
   const tethers = getHitboxTethers(hitbox);
   if (tethers !== undefined) {
      packet.writeNumber(tethers.length);
      for (const tether of tethers) {
         const otherHitbox = tether.getOtherHitbox(hitbox);
         addBoxDataToPacket(packet, otherHitbox.box);
         packet.writeNumber(tether.idealDistance);
         packet.writeNumber(tether.springConstant);
         packet.writeNumber(tether.damping);
      }
   } else {
      packet.writeNumber(0);
   }

   packet.writeNumber(hitbox.previousRelativeAngle);
   packet.writeNumber(hitbox.angularAcceleration);
   
   packet.writeNumber(hitbox.mass);
   packet.writeNumber(hitbox.collisionBit);
   packet.writeNumber(hitbox.collisionMask);
   packet.writeNumber(hitbox.flags);

   packet.writeNumber(hitbox.entity);
   packet.writeNumber(hitbox.rootEntity);

   // Parent
   if (hitbox.parent !== null) {
      packet.writeNumber(hitbox.parent.entity);
      packet.writeNumber(hitbox.parent.localID);
   } else {
      packet.writeNumber(0);
      packet.writeNumber(-1);
   }

   // Children
   // @BANDWIDTH: might be able to just... not send this, and have the client figure out the children from themselves since they already know all the parents
   packet.writeNumber(hitbox.children.length);
   for (const child of hitbox.children) {
      packet.writeNumber(child.entity);
      packet.writeNumber(child.localID);
   }
}
export function getHitboxDataLength(hitbox: Hitbox): number {
   let lengthBytes = Bytes.Float32;
   lengthBytes += getBoxDataLength(hitbox.box);
   lengthBytes += 4 * Bytes.Float32;

   // Tethers
   lengthBytes += Bytes.Float32;
   const tethers = getHitboxTethers(hitbox);
   if (tethers !== undefined) {
      for (const tether of tethers) {
         const otherHitbox = tether.getOtherHitbox(hitbox);
         lengthBytes += getBoxDataLength(otherHitbox.box);
         lengthBytes += 3 * Bytes.Float32;
      }
   }
   
   // angle shit
   lengthBytes += 2 * Bytes.Float32;
   lengthBytes += 3 * Bytes.Float32;
   lengthBytes += Bytes.Float32; // flags
   lengthBytes += 2 * Bytes.Float32; // entity, rootEntity
   lengthBytes += 2 * Bytes.Float32; // parent hitbox entity, local id
   lengthBytes += Bytes.Float32 + 2 * Bytes.Float32 * hitbox.children.length; // children
   return lengthBytes;
}