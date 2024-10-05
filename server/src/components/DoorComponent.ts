import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { angle, lerp } from "battletribes-shared/utils";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { ComponentArray } from "./ComponentArray";
import { EntityConfig } from "../components";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";

const DOOR_SWING_SPEED = 5 / Settings.TPS;

export class DoorComponent {
   public originX = 0;
   public originY = 0;
   public closedRotation = 0;
   
   public toggleType = DoorToggleType.none;
   public openProgress = 0;
}

export const DoorComponentArray = new ComponentArray<DoorComponent>(ServerComponentType.door, true, {
   onInitialise: onInitialise,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const doorHalfDiagonalLength = Math.sqrt(16 * 16 + 64 * 64) / 2;
const angleToCenter = angle(16, 64);

const updateDoorOpenProgress = (door: EntityID, doorComponent: DoorComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(door);
   
   const rotation = doorComponent.closedRotation + lerp(0, -Math.PI/2 + 0.1, doorComponent.openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + Math.PI/2 + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(doorComponent.closedRotation + Math.PI/2 + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(doorComponent.closedRotation + Math.PI/2 + angleToCenter);

   transformComponent.position.x = doorComponent.originX + xOffset;
   transformComponent.position.y = doorComponent.originY + yOffset;
   transformComponent.rotation = rotation;

   const physicsComponent = PhysicsComponentArray.getComponent(door);
   physicsComponent.hitboxesAreDirty = true;
}

function onTick(doorComponent: DoorComponent, door: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(door);
   
   switch (doorComponent.toggleType) {
      case DoorToggleType.open: {
         doorComponent.openProgress += DOOR_SWING_SPEED;
         if (doorComponent.openProgress >= 1) {
            doorComponent.openProgress = 1;
            doorComponent.toggleType = DoorToggleType.none;
         }
         updateDoorOpenProgress(door, doorComponent);

         transformComponent.hitboxes[0].collisionType = HitboxCollisionType.soft;
         break;
      }
      case DoorToggleType.close: {
         doorComponent.openProgress -= DOOR_SWING_SPEED;
         if (doorComponent.openProgress <= 0) {
            doorComponent.openProgress = 0;
            doorComponent.toggleType = DoorToggleType.none;
         }
         updateDoorOpenProgress(door, doorComponent);

         transformComponent.hitboxes[0].collisionType = HitboxCollisionType.hard;
         break;
      }
   }
}

export function toggleDoor(door: EntityID): void {
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
function onInitialise(config: EntityConfig<ServerComponentType.transform | ServerComponentType.door>): void {
   config.components[ServerComponentType.door].originX = config.components[ServerComponentType.transform].position.x;
   config.components[ServerComponentType.door].originY = config.components[ServerComponentType.transform].position.y;
   config.components[ServerComponentType.door].closedRotation = config.components[ServerComponentType.transform].rotation;
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const doorComponent = DoorComponentArray.getComponent(entity);

   packet.addNumber(doorComponent.toggleType);
   packet.addNumber(doorComponent.openProgress);
}

export function doorIsClosed(door: EntityID): boolean {
   const doorComponent = DoorComponentArray.getComponent(door);
   return doorComponent.openProgress === 0;
}