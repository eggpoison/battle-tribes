import { DoorComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { DoorToggleType, EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { angle, lerp } from "webgl-test-shared/dist/utils";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { ComponentArray } from "./ComponentArray";
import { HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ComponentConfig } from "../components";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "webgl-test-shared/dist/packets";

export interface DoorComponentParams {
   originX: number;
   originY: number;
   closedRotation: number;
}

const DOOR_SWING_SPEED = 5 / Settings.TPS;

export class DoorComponent {
   public readonly originX: number;
   public readonly originY: number;
   public readonly closedRotation: number;
   
   public toggleType = DoorToggleType.none;
   public openProgress = 0;

   constructor(params: DoorComponentParams) {
      this.originX = params.originX;
      this.originY = params.originY;
      this.closedRotation = params.closedRotation;
   }
}

export const DoorComponentArray = new ComponentArray<DoorComponent>(ServerComponentType.door, true, {
   onInitialise: onInitialise,
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

export function tickDoorComponent(door: EntityID): void {
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
function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.door>): void {
   config[ServerComponentType.door].originX = config[ServerComponentType.transform].position.x;
   config[ServerComponentType.door].originY = config[ServerComponentType.transform].position.y;
   config[ServerComponentType.door].closedRotation = config[ServerComponentType.transform].rotation;
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