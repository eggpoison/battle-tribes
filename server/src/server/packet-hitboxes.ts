import { BaseBox } from "../../../shared/src/boxes/BaseBox";
import { Box, boxIsCircular } from "../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../shared/src/boxes/CircularBox";
import { RectangularBox } from "../../../shared/src/boxes/RectangularBox";
import { Packet } from "../../../shared/src/packets";
import { Hitbox } from "../hitboxes";

const addBaseBoxData = (packet: Packet, box: BaseBox): void => {
   packet.writeNumber(box.position.x);
   packet.writeNumber(box.position.y);
   packet.writeNumber(box.relativeAngle);
   packet.writeNumber(box.angle);
   packet.writeNumber(box.offset.x);
   packet.writeNumber(box.offset.y);

   // Pivot
   packet.writeNumber(box.pivot.type);
   packet.writeNumber(box.pivot.pos.x);
   packet.writeNumber(box.pivot.pos.y);
   
   packet.writeNumber(box.scale);
   packet.writeBool(box.totalFlipXMultiplier === -1 ? true : false);
}
const getBaseBoxDataLength = (): number => {
   return 11 * Float32Array.BYTES_PER_ELEMENT;
}

const addCircularBoxData = (packet: Packet, box: CircularBox): void => {
   addBaseBoxData(packet, box);
   packet.writeNumber(box.radius);
}
const getCircularBoxDataLength = (): number => {
   return getBaseBoxDataLength() + Float32Array.BYTES_PER_ELEMENT;
}

const addRectangularBoxData = (packet: Packet, box: RectangularBox): void => {
   addBaseBoxData(packet, box);
   packet.writeNumber(box.width);
   packet.writeNumber(box.height);
}
const getRectangularBoxDataLength = (): number => {
   return getBaseBoxDataLength() + 2 * Float32Array.BYTES_PER_ELEMENT;
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
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
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

   packet.writeNumber(hitbox.previousPosition.x);
   packet.writeNumber(hitbox.previousPosition.y);
   packet.writeNumber(hitbox.acceleration.x);
   packet.writeNumber(hitbox.acceleration.y);

   // Tethers
   packet.writeNumber(hitbox.tethers.length);
   for (const tether of hitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(hitbox);
      addBoxDataToPacket(packet, otherHitbox.box);
      packet.writeNumber(tether.idealDistance);
      packet.writeNumber(tether.springConstant);
      packet.writeNumber(tether.damping);
   }

   packet.writeNumber(hitbox.previousRelativeAngle);
   packet.writeNumber(hitbox.angularAcceleration);
   
   packet.writeNumber(hitbox.mass);
   packet.writeNumber(hitbox.collisionType);
   packet.writeNumber(hitbox.collisionBit);
   packet.writeNumber(hitbox.collisionMask);
   // Flags
   packet.writeNumber(hitbox.flags.length);
   for (const flag of hitbox.flags) {
      packet.writeNumber(flag);
   }

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

   packet.writeBool(hitbox.isPartOfParent);
   packet.writeBool(hitbox.isStatic);
}
export function getHitboxDataLength(hitbox: Hitbox): number {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += getBoxDataLength(hitbox.box);
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;

   // Tethers
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const tether of hitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(hitbox);
      lengthBytes += getBoxDataLength(otherHitbox.box);
      lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
   }
   
   // angle shit
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * hitbox.flags.length;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT; // entity, rootEntity
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT; // parent hitbox entity, local id
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * hitbox.children.length; // children
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT; // isPartOfParent, isStatic
   return lengthBytes;
}