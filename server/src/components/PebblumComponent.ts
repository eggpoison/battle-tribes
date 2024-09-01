import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { moveEntityToPosition, stopEntity } from "../ai-shared";
import Board from "../Board";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { UtilVars } from "webgl-test-shared/dist/utils";

const enum Vars {
   TURN_SPEED = UtilVars.PI * 2
}

export interface PebblumComponentParams {
   targetEntityID: number;
}

export class PebblumComponent {
   public targetEntityID: number;
   
   constructor(params: PebblumComponentParams) {
      this.targetEntityID = params.targetEntityID
   }
}

export const PebblumComponentArray = new ComponentArray<PebblumComponent>(ServerComponentType.pebblum, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(pebblumComponent: PebblumComponent, pebblum: EntityID): void {
   const target = pebblumComponent.targetEntityID;
   if (Board.hasEntity(target)) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);

      moveEntityToPosition(pebblum, targetTransformComponent.position.x, targetTransformComponent.position.y, 850, Vars.TURN_SPEED);
   } else {
      const physicsComponent = PhysicsComponentArray.getComponent(pebblum);
      stopEntity(physicsComponent);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}