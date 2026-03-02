import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, Entity } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { getHitboxByFlag, TransformComponentArray } from "./TransformComponent";
import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { setHitboxRelativeAngle } from "../hitboxes";
import { Settings } from "../../../shared/src/settings";

const enum Vars {
   DOOR_SWING_SPEED = 5 * Settings.DT_S
}

export class FenceGateComponent {
   public toggleType = DoorToggleType.none;
   public openProgress = 0;
}

export const FenceGateComponentArray = new ComponentArray<FenceGateComponent>(ServerComponentType.fenceGate, true, getDataLength, addDataToPacket);
FenceGateComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const updateDoorOpenProgress = (fenceGate: Entity, fenceGateComponent: FenceGateComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(fenceGate);
   const doorHitbox = getHitboxByFlag(transformComponent, HitboxFlag.FENCE_GATE_DOOR);
   if (doorHitbox !== null) {
      setHitboxRelativeAngle(doorHitbox, -(Math.PI/2 - 0.1) * fenceGateComponent.openProgress);
   }
}

function onTick(fenceGate: Entity): void {
   // @Incomplete: Hard hitboxes
   
   const fenceGateComponent = FenceGateComponentArray.getComponent(fenceGate);
   if (fenceGateComponent.toggleType !== DoorToggleType.none) {
      if (fenceGateComponent.toggleType === DoorToggleType.open) {
         fenceGateComponent.openProgress += Vars.DOOR_SWING_SPEED;
         if (fenceGateComponent.openProgress >= 1) {
            fenceGateComponent.openProgress = 1;
            fenceGateComponent.toggleType = DoorToggleType.none;
         }
      } else {
         fenceGateComponent.openProgress -= Vars.DOOR_SWING_SPEED;
         if (fenceGateComponent.openProgress <= 0) {
            fenceGateComponent.openProgress = 0;
            fenceGateComponent.toggleType = DoorToggleType.none;
         }
      }
      updateDoorOpenProgress(fenceGate, fenceGateComponent);
   }
}

export function toggleFenceGateDoor(fenceGate: Entity): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(fenceGate);
   if (fenceGateComponent.toggleType !== DoorToggleType.none) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(fenceGate);
   
   const doorHitbox = getHitboxByFlag(transformComponent, HitboxFlag.FENCE_GATE_DOOR);
   if (doorHitbox !== null) {
      if (fenceGateComponent.openProgress === 0) {
         // Open the door
         fenceGateComponent.toggleType = DoorToggleType.open;
         doorHitbox.collisionType = HitboxCollisionType.soft;
      } else {
         // Close the door
         fenceGateComponent.toggleType = DoorToggleType.close;
         doorHitbox.collisionType = HitboxCollisionType.hard;
      }
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}