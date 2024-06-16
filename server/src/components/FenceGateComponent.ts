import { FenceGateComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { DoorToggleType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { angle, lerp } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import Entity from "../Entity";
import { RectangularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

// @Cleanup: All the door toggling logic is stolen from DoorComponent.ts

const enum Vars {
   DOOR_SWING_SPEED = 5 / Settings.TPS
}

export class FenceGateComponent {
   public toggleType = DoorToggleType.none;
   public openProgress = 0;
}

export const FenceGateComponentArray = new ComponentArray<ServerComponentType.fenceGate, FenceGateComponent>(true, {
   serialise: serialise
});

const doorWidth = 52;
const doorHeight = 16;

const doorHalfDiagonalLength = Math.sqrt(doorHeight * doorHeight + doorWidth * doorWidth) / 2;
const angleToCenter = angle(doorHeight, doorWidth);

const updateDoorOpenProgress = (fenceGate: Entity, fenceGateComponent: FenceGateComponent): void => {
   const baseRotation = Math.PI/2;
   const rotation = baseRotation - lerp(0, Math.PI/2 - 0.1, fenceGateComponent.openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

   const hitbox = fenceGate.hitboxes[0] as RectangularHitbox;
   hitbox.offset.x = xOffset;
   hitbox.offset.y = yOffset;
   hitbox.relativeRotation = rotation - Math.PI/2;
}

export function tickFenceGateComponent(fenceGate: Entity): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(fenceGate.id);

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

export function toggleFenceGateDoor(fenceGate: Entity): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(fenceGate.id);
   if (fenceGateComponent.toggleType !== DoorToggleType.none) {
      return;
   }
   
   const hitbox = fenceGate.hitboxes[0];
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

function serialise(entityID: number): FenceGateComponentData {
   const fenceGateComponent = FenceGateComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.fenceGate,
      toggleType: fenceGateComponent.toggleType,
      openProgress: fenceGateComponent.openProgress
   };
}