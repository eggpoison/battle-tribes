import { Entity, ServerComponentType } from "battletribes-shared";
import { deregisterEntitySupports, registerEntitySupports } from "../collapses.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";

export class BracingsComponent {}

export const BracingsComponentArray = new ComponentArray<BracingsComponent>(ServerComponentType.bracings, true, getDataLength, addDataToPacket);
BracingsComponentArray.onJoin = onJoin;
BracingsComponentArray.onRemove = onRemove;

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   registerEntitySupports(transformComponent);
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   deregisterEntitySupports(transformComponent);
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}