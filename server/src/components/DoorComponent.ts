import { DoorComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { DoorToggleType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { angle, lerp } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { ComponentArray } from "./ComponentArray";
import { HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const DOOR_SWING_SPEED = 5 / Settings.TPS;

export class DoorComponent {
   public readonly originX: number;
   public readonly originY: number;
   public readonly closedRotation: number;
   
   public toggleType = DoorToggleType.none;
   public openProgress = 0;

   constructor(originX: number, originY: number, closedRotation: number) {
      this.originX = originX;
      this.originY = originY;
      this.closedRotation = closedRotation;
   }
}

export const DoorComponentArray = new ComponentArray<ServerComponentType.door, DoorComponent>(true, {
   serialise: serialise
});

const doorHalfDiagonalLength = Math.sqrt(16 * 16 + 64 * 64) / 2;
const angleToCenter = angle(16, 64);

const updateDoorOpenProgress = (door: Entity, doorComponent: DoorComponent): void => {
   const rotation = doorComponent.closedRotation + lerp(0, -Math.PI/2 + 0.1, doorComponent.openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + Math.PI/2 + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(doorComponent.closedRotation + Math.PI/2 + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(doorComponent.closedRotation + Math.PI/2 + angleToCenter);

   door.position.x = doorComponent.originX + xOffset;
   door.position.y = doorComponent.originY + yOffset;
   door.rotation = rotation;

   const physicsComponent = PhysicsComponentArray.getComponent(door.id);
   physicsComponent.hitboxesAreDirty = true;
}

export function tickDoorComponent(door: Entity): void {
   const doorComponent = DoorComponentArray.getComponent(door.id);
   
   switch (doorComponent.toggleType) {
      case DoorToggleType.open: {
         doorComponent.openProgress += DOOR_SWING_SPEED;
         if (doorComponent.openProgress >= 1) {
            doorComponent.openProgress = 1;
            doorComponent.toggleType = DoorToggleType.none;
         }
         updateDoorOpenProgress(door, doorComponent);

         door.hitboxes[0].collisionType = HitboxCollisionType.soft;
         break;
      }
      case DoorToggleType.close: {
         doorComponent.openProgress -= DOOR_SWING_SPEED;
         if (doorComponent.openProgress <= 0) {
            doorComponent.openProgress = 0;
            doorComponent.toggleType = DoorToggleType.none;
         }
         updateDoorOpenProgress(door, doorComponent);

         door.hitboxes[0].collisionType = HitboxCollisionType.hard;
         break;
      }
   }
}

export function toggleDoor(door: Entity): void {
   const doorComponent = DoorComponentArray.getComponent(door.id);

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

function serialise(entityID: number): DoorComponentData {
   const doorComponent = DoorComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.door,
      toggleType: doorComponent.toggleType,
      openProgress: doorComponent.openProgress
   }
}

export function doorIsClosed(door: Entity): boolean {
   const doorComponent = DoorComponentArray.getComponent(door.id);
   return doorComponent.openProgress === 0;
}