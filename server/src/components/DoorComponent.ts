import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { angle, lerp, Point } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { EntityConfig } from "../components";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { setHitboxAngle, teleportHitbox } from "../hitboxes";

const DOOR_SWING_SPEED = 5 * Settings.DT_S;

export class DoorComponent {
   public originX = 0;
   public originY = 0;
   public closedAngle = 0;
   
   public toggleType = DoorToggleType.none;
   public openProgress = 0;
}

export const DoorComponentArray = new ComponentArray<DoorComponent>(ServerComponentType.door, true, getDataLength, addDataToPacket);
DoorComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
DoorComponentArray.onInitialise = onInitialise;

const doorHalfDiagonalLength = Math.sqrt(16 * 16 + 64 * 64) / 2;
const angleToCenter = angle(16, 64);

const updateDoorOpenProgress = (door: Entity, doorComponent: DoorComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(door);
   const doorHitbox = transformComponent.hitboxes[0];
   
   const angle = doorComponent.closedAngle + lerp(0, -Math.PI/2 + 0.1, doorComponent.openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = angle + Math.PI/2 + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(doorComponent.closedAngle + Math.PI/2 + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(doorComponent.closedAngle + Math.PI/2 + angleToCenter);

   teleportHitbox(doorHitbox, new Point(doorComponent.originX + xOffset, doorComponent.originY + yOffset));
   setHitboxAngle(doorHitbox, angle);
   transformComponent.isDirty = true;
}

function onTick(door: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(door);
   const doorComponent = DoorComponentArray.getComponent(door);
   
   switch (doorComponent.toggleType) {
      case DoorToggleType.open: {
         doorComponent.openProgress += DOOR_SWING_SPEED;
         if (doorComponent.openProgress >= 1) {
            doorComponent.openProgress = 1;
            doorComponent.toggleType = DoorToggleType.none;
         }
         updateDoorOpenProgress(door, doorComponent);

         (transformComponent.hitboxes[0]).collisionType = HitboxCollisionType.soft;
         break;
      }
      case DoorToggleType.close: {
         doorComponent.openProgress -= DOOR_SWING_SPEED;
         if (doorComponent.openProgress <= 0) {
            doorComponent.openProgress = 0;
            doorComponent.toggleType = DoorToggleType.none;
         }
         updateDoorOpenProgress(door, doorComponent);

         (transformComponent.hitboxes[0]).collisionType = HitboxCollisionType.hard;
         break;
      }
   }
}

export function toggleDoor(door: Entity): void {
   const doorComponent = DoorComponentArray.getComponent(door);

   // Don't toggle if already in the middle of opening/closing
   if (doorComponent.toggleType !== DoorToggleType.none) {
      return;
   }

   if (doorComponent.openProgress === 0) {
      // Open the door
      doorComponent.toggleType = DoorToggleType.open;
   } else {
      // Close the door
      doorComponent.toggleType = DoorToggleType.close;
   }
}

// @Hack
function onInitialise(config: EntityConfig): void {
   const transformComponent = config.components[ServerComponentType.transform]!;
   const doorHitbox = transformComponent.hitboxes[0];
   
   config.components[ServerComponentType.door]!.originX = doorHitbox.box.position.x;
   config.components[ServerComponentType.door]!.originY = doorHitbox.box.position.y;
   config.components[ServerComponentType.door]!.closedAngle = doorHitbox.box.relativeAngle;
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const doorComponent = DoorComponentArray.getComponent(entity);

   packet.writeNumber(doorComponent.toggleType);
   packet.writeNumber(doorComponent.openProgress);
}

export function doorIsClosed(door: Entity): boolean {
   const doorComponent = DoorComponentArray.getComponent(door);
   return doorComponent.openProgress === 0;
}