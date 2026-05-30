import { ServerComponentType, Entity, Packet, _point, Point, rotatePoint, rotatePointAroundOrigin } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { Hitbox, translateHitbox } from "../hitboxes.js";
import { entityExists } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { attachHitbox, detachHitbox, TransformComponentArray } from "./TransformComponent.js";

// @Cleanup: only exported cuz someone uses it in transformcomponent
export interface CarrySlot {
   occupiedEntity: Entity;
   readonly parentHitbox: Hitbox;
   readonly offset: Point;
   // Offset from the carry slot
   readonly dismountOffset: Point;
}

export class RideableComponent {
   readonly carrySlots: Array<CarrySlot> = [];
}

export const RideableComponentArray = new ComponentArray<RideableComponent>(ServerComponentType.rideable, true, getDataLength, addDataToPacket);

export function createCarrySlot(parentHitbox: Hitbox, offset: Point, dismountOffset: Point): CarrySlot {
   return {
      occupiedEntity: 0,
      parentHitbox: parentHitbox,
      offset: offset,
      dismountOffset: dismountOffset
   };
}

function getDataLength(entity: Entity): number {
   const rideableComponent = RideableComponentArray.getComponent(entity);
   return Bytes.Float32 + 6 * Bytes.Float32 * rideableComponent.carrySlots.length;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(entity);

   packet.writeNumber(rideableComponent.carrySlots.length);
   for (const carrySlot of rideableComponent.carrySlots) {
      packet.writeNumber(carrySlot.occupiedEntity);
      packet.writeNumber(carrySlot.parentHitbox.localID);
      packet.writePoint(carrySlot.offset);
      packet.writePoint(carrySlot.dismountOffset);
   }
}

export function getAvailableCarrySlot(rideableComponent: RideableComponent): CarrySlot | null {
   for (const carrySlot of rideableComponent.carrySlots) {
      if (!entityExists(carrySlot.occupiedEntity)) {
         return carrySlot;
      }
   }
   return null;
}

export function mountCarrySlot(entity: Entity, carrySlot: CarrySlot): void {
   // Set the entity to the carry slot's position
   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = entityTransformComponent.hitboxes[0];
   rotatePointAroundOrigin(carrySlot.offset.x, carrySlot.offset.y, carrySlot.parentHitbox.box.angle);
   entityHitbox.box.posX = carrySlot.parentHitbox.box.posX + _point.x;
   entityHitbox.box.posX = carrySlot.parentHitbox.box.posY + _point.y;
   
   // attachEntityWithTether(entity, mount, carrySlot.parentHitbox, 0, 10, 0.4, false);
   // @INCOMPLETE: SHOULD USE TETHER!!!!
   if (entityHitbox.parent !== null) {
      detachHitbox(entityHitbox);
   }
   attachHitbox(entityHitbox, carrySlot.parentHitbox, false);
   carrySlot.occupiedEntity = entity;
}

export function dismountMount(entity: Entity, mount: Entity): void {
   // @Copynpaste the same shit in detachHitbox
   let carrySlot: CarrySlot | undefined;
   const rideableComponent = RideableComponentArray.getComponent(mount);
   for (const currentCarrySlot of rideableComponent.carrySlots) {
      if (currentCarrySlot.occupiedEntity === entity) {
         carrySlot = currentCarrySlot;
         break;
      }
   }
   
   if (carrySlot === undefined) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const rootHitbox of transformComponent.rootHitboxes) {
      if (rootHitbox.parent !== null && rootHitbox.parent.entity === mount) {
         detachHitbox(rootHitbox);
      }
   }

   // Set the entity to the dismount position

   const entityHitbox = transformComponent.hitboxes[0];
   const mountHitbox = carrySlot.parentHitbox;
   translateHitbox(entityHitbox, rotatePoint(new Point(carrySlot.offset.x + carrySlot.dismountOffset.x, carrySlot.offset.y + carrySlot.dismountOffset.y), mountHitbox.box.angle));
}