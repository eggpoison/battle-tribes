import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { TunnelComponentData } from "webgl-test-shared/dist/components";
import { DoorToggleType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { angle, lerp } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { TunnelComponentArray } from "./ComponentArray";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

const DOOR_HITBOX_MASS = 1;
const DOOR_HITBOX_WIDTH = 48;
const DOOR_HITBOX_HEIGHT = 16;
const DOOR_HITBOX_OFFSET = 30;
const THIN_HITBOX_HEIGHT = 0.1;

// @Cleanup: All the door toggling logic is stolen from DoorComponent.ts

const enum DoorType {
   top,
   bottom
}

const DOOR_SWING_SPEED = 5 / Settings.TPS;

export class TunnelComponent {
   public doorBitset = 0;
   /** Door bit of the first hitbox to be added to the tunnel in the hitboxes array */
   public firstHitboxDoorBit = 0;

   public topDoorToggleType = DoorToggleType.none;
   public topDoorOpenProgress = 0;

   public bottomDoorToggleType = DoorToggleType.none;
   public bottomDoorOpenProgress = 0;
}

const doorHalfDiagonalLength = Math.sqrt(16 * 16 + 48 * 48) / 2;
const angleToCenter = angle(16, 48);

const updateDoorOpenProgress = (tunnel: Entity, tunnelComponent: TunnelComponent, doorType: DoorType): void => {
   const openProgress = doorType === DoorType.top ? tunnelComponent.topDoorOpenProgress : tunnelComponent.bottomDoorOpenProgress;
   const toggleType = doorType === DoorType.top ? tunnelComponent.topDoorToggleType : tunnelComponent.bottomDoorToggleType;
   const doorBit = doorType === DoorType.top ? 0b01 : 0b10;

   let hasHardHitbox = true;
   if (toggleType === DoorToggleType.close || openProgress === 0) {
      // Create hard hitbox
      const alreadyExists = doorBit === tunnelComponent.firstHitboxDoorBit ? (tunnel.hitboxes.length > 5 && tunnel.hitboxes[5].collisionType === HitboxCollisionType.hard) : tunnel.hitboxes[tunnel.hitboxes.length - 1].collisionType === HitboxCollisionType.hard;
      if (!alreadyExists) {
         const hitbox = new RectangularHitbox(tunnel.position.x, tunnel.position.y, 0.5, 0, 0, HitboxCollisionType.hard, tunnel.getNextHitboxLocalID(), tunnel.rotation, DOOR_HITBOX_WIDTH, THIN_HITBOX_HEIGHT, 0);
         tunnel.addHitbox(hitbox);
         
         // @Hack!!! Wouldn't be needed if we had a hitbox awake/asleep system
         if (doorBit === tunnelComponent.firstHitboxDoorBit) {
            tunnel.hitboxes.pop();
            tunnel.hitboxes.splice(5, 0, hitbox);
         }
      }
   } else if (toggleType === DoorToggleType.open || openProgress === 1) {
      hasHardHitbox = false;
      if (doorBit === tunnelComponent.firstHitboxDoorBit) {
         if (tunnel.hitboxes.length > 5 && tunnel.hitboxes[5].collisionType === HitboxCollisionType.hard) {
            tunnel.hitboxes.splice(5, 1);
         }
      } else {
         if (tunnel.hitboxes[tunnel.hitboxes.length - 1].collisionType === HitboxCollisionType.hard) {
            tunnel.hitboxes.pop();
         }
      }
   }
   
   const baseRotation = doorType === DoorType.top ? -Math.PI/2 : Math.PI/2;
   const rotation = baseRotation + lerp(0, Math.PI/2 - 0.1, openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

   const softDoorHitbox = tunnel.hitboxes[doorBit === tunnelComponent.firstHitboxDoorBit ? 4 : (tunnel.hitboxes[5].collisionType === HitboxCollisionType.hard ? 6 : 5)] as RectangularHitbox;
   softDoorHitbox.offsetX = xOffset;
   softDoorHitbox.offsetY = yOffset + (doorType === DoorType.top ? DOOR_HITBOX_OFFSET : -DOOR_HITBOX_OFFSET);
   softDoorHitbox.relativeRotation = rotation + Math.PI/2;

   if (hasHardHitbox) {
      const hardDoorHitbox = tunnel.hitboxes[doorBit === tunnelComponent.firstHitboxDoorBit ? 5 : (tunnel.hitboxes[5].collisionType === HitboxCollisionType.hard ? 7 : 6)] as RectangularHitbox;
      hardDoorHitbox.offsetX = xOffset + DOOR_HITBOX_HEIGHT * 0.5 * Math.sin(rotation + Math.PI/2);
      hardDoorHitbox.offsetY = yOffset + DOOR_HITBOX_HEIGHT * 0.5 * Math.cos(rotation + Math.PI/2) + (doorType === DoorType.top ? DOOR_HITBOX_OFFSET : -DOOR_HITBOX_OFFSET);
      hardDoorHitbox.relativeRotation = rotation + Math.PI/2;
   }
}

export function tickTunnelComponent(tunnel: Entity): void {
   const tunnelComponent = TunnelComponentArray.getComponent(tunnel.id);

   // @Incomplete: Hard hitboxes
   
   if (tunnelComponent.topDoorToggleType !== DoorToggleType.none) {
      switch (tunnelComponent.topDoorToggleType) {
         case DoorToggleType.open: {
            tunnelComponent.topDoorOpenProgress += DOOR_SWING_SPEED;
            if (tunnelComponent.topDoorOpenProgress >= 1) {
               tunnelComponent.topDoorOpenProgress = 1;
               tunnelComponent.topDoorToggleType = DoorToggleType.none;
            }
            break;
         }
         case DoorToggleType.close: {
            tunnelComponent.topDoorOpenProgress -= DOOR_SWING_SPEED;
            if (tunnelComponent.topDoorOpenProgress <= 0) {
               tunnelComponent.topDoorOpenProgress = 0;
               tunnelComponent.topDoorToggleType = DoorToggleType.none;
            }
            break;
         }
      }
      updateDoorOpenProgress(tunnel, tunnelComponent, DoorType.top);
   }
   if (tunnelComponent.bottomDoorToggleType !== DoorToggleType.none) {
      switch (tunnelComponent.bottomDoorToggleType) {
         case DoorToggleType.open: {
            tunnelComponent.bottomDoorOpenProgress += DOOR_SWING_SPEED;
            if (tunnelComponent.bottomDoorOpenProgress >= 1) {
               tunnelComponent.bottomDoorOpenProgress = 1;
               tunnelComponent.bottomDoorToggleType = DoorToggleType.none;
            }
            break;
         }
         case DoorToggleType.close: {
            tunnelComponent.bottomDoorOpenProgress -= DOOR_SWING_SPEED;
            if (tunnelComponent.bottomDoorOpenProgress <= 0) {
               tunnelComponent.bottomDoorOpenProgress = 0;
               tunnelComponent.bottomDoorToggleType = DoorToggleType.none;
            }
            break;
         }
      }
      updateDoorOpenProgress(tunnel, tunnelComponent, DoorType.bottom);
   }
}

export function toggleTunnelDoor(tunnel: Entity, doorBit: number): void {
   const tunnelComponent = TunnelComponentArray.getComponent(tunnel.id);
   if ((tunnelComponent.doorBitset & doorBit) === 0) {
      return;
   }

   switch (doorBit) {
      case 0b01: {
         if (tunnelComponent.topDoorToggleType === DoorToggleType.none) {
            if (tunnelComponent.topDoorOpenProgress === 0) {
               // Open the door
               tunnelComponent.topDoorToggleType = DoorToggleType.open;
            } else {
               // Close the door
               tunnelComponent.topDoorToggleType = DoorToggleType.close;
            }
         }
         break;
      }
      case 0b10: {
         if (tunnelComponent.bottomDoorToggleType === DoorToggleType.none) {
            if (tunnelComponent.bottomDoorOpenProgress === 0) {
               // Open the door
               tunnelComponent.bottomDoorToggleType = DoorToggleType.open;
            } else {
               // Close the door
               tunnelComponent.bottomDoorToggleType = DoorToggleType.close;
            }
         }
         break;
      }
   }
}

export function serialiseTunnelComponent(tunnel: Entity): TunnelComponentData {
   const tunnelComponent = TunnelComponentArray.getComponent(tunnel.id);
   return {
      doorBitset: tunnelComponent.doorBitset,
      topDoorOpenProgress: tunnelComponent.topDoorOpenProgress,
      bottomDoorOpenProgress: tunnelComponent.bottomDoorOpenProgress
   };
}

export function updateTunnelDoorBitset(tunnel: Entity, doorBitset: number): void {
   const tunnelComponent = TunnelComponentArray.getComponent(tunnel.id);

   if ((tunnelComponent.doorBitset & 0b01) !== (doorBitset & 0b01)) {
      // Add top door hitbox
      tunnel.addHitbox(new RectangularHitbox(tunnel.position.x, tunnel.position.y, DOOR_HITBOX_MASS, 0, DOOR_HITBOX_OFFSET, HitboxCollisionType.soft, tunnel.getNextHitboxLocalID(), tunnel.rotation, DOOR_HITBOX_WIDTH, DOOR_HITBOX_HEIGHT, 0));
      if (tunnel.hitboxes.length === 5) {
         tunnelComponent.firstHitboxDoorBit = 0b01;
      }
      updateDoorOpenProgress(tunnel, tunnelComponent, DoorType.top);
   }
   if ((tunnelComponent.doorBitset & 0b10) !== (doorBitset & 0b10)) {
      // Add bottom door hitbox
      tunnel.addHitbox(new RectangularHitbox(tunnel.position.x, tunnel.position.y, DOOR_HITBOX_MASS, 0, -DOOR_HITBOX_OFFSET, HitboxCollisionType.soft, tunnel.getNextHitboxLocalID(), tunnel.rotation, DOOR_HITBOX_WIDTH, DOOR_HITBOX_HEIGHT, 0));
      if (tunnel.hitboxes.length === 5) {
         tunnelComponent.firstHitboxDoorBit = 0b10;
      }
      updateDoorOpenProgress(tunnel, tunnelComponent, DoorType.bottom);
   }

   tunnelComponent.doorBitset = doorBitset;
}