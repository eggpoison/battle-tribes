import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { angle, lerp } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";

// @Cleanup: All the door toggling logic is stolen from DoorComponent.ts

const enum Vars {
   DOOR_SWING_SPEED = 5 / Settings.TPS
}

export class FenceGateComponent {
   public toggleType = DoorToggleType.none;
   public openProgress = 0;
}

export const FenceGateComponentArray = new ComponentArray<FenceGateComponent>(ServerComponentType.fenceGate, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const doorWidth = 52;
const doorHeight = 16;

const doorHalfDiagonalLength = Math.sqrt(doorHeight * doorHeight + doorWidth * doorWidth) / 2;
const angleToCenter = angle(doorHeight, doorWidth);

const updateDoorOpenProgress = (fenceGate: EntityID, fenceGateComponent: FenceGateComponent): void => {
   const baseRotation = Math.PI/2;
   const rotation = baseRotation - lerp(0, Math.PI/2 - 0.1, fenceGateComponent.openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

   const transformComponent = TransformComponentArray.getComponent(fenceGate);
   
   const hitbox = transformComponent.hitboxes[0].box as RectangularBox;
   hitbox.offset.x = xOffset;
   hitbox.offset.y = yOffset;
   hitbox.relativeRotation = rotation - Math.PI/2;
}

function onTick(fenceGateComponent: FenceGateComponent, fenceGate: EntityID): void {
   // @Incomplete: Hard hitboxes
   
   if (fenceGateComponent.toggleType !== DoorToggleType.none) {
      switch (fenceGateComponent.toggleType) {
         case DoorToggleType.open: {
            fenceGateComponent.openProgress += Vars.DOOR_SWING_SPEED;
            if (fenceGateComponent.openProgress >= 1) {
               fenceGateComponent.openProgress = 1;
               fenceGateComponent.toggleType = DoorToggleType.none;
            }
            break;
         }
         case DoorToggleType.close: {
            fenceGateComponent.openProgress -= Vars.DOOR_SWING_SPEED;
            if (fenceGateComponent.openProgress <= 0) {
               fenceGateComponent.openProgress = 0;
               fenceGateComponent.toggleType = DoorToggleType.none;
            }
            break;
         }
      }
      updateDoorOpenProgress(fenceGate, fenceGateComponent);
   }
}

export function toggleFenceGateDoor(fenceGate: EntityID): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(fenceGate);
   if (fenceGateComponent.toggleType !== DoorToggleType.none) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(fenceGate);
   
   const hitbox = transformComponent.hitboxes[0];
   if (fenceGateComponent.openProgress === 0) {
      // Open the door
      fenceGateComponent.toggleType = DoorToggleType.open;
      hitbox.collisionType = HitboxCollisionType.soft;
   } else {
      // Close the door
      fenceGateComponent.toggleType = DoorToggleType.close;
      hitbox.collisionType = HitboxCollisionType.hard;
   }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(entity);

   packet.addNumber(fenceGateComponent.toggleType);
   packet.addNumber(fenceGateComponent.openProgress);
}