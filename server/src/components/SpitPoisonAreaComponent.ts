import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { TransformComponentArray } from "./TransformComponent";

export interface SpitPoisonAreaComponentParams {}

export class SpitPoisonAreaComponent {}

export const SpitPoisonAreaComponentArray = new ComponentArray<SpitPoisonAreaComponent>(ServerComponentType.spitPoisonArea, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(_spitPoisonAreaComponent: SpitPoisonAreaComponent, spit: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(spit);
   
   const hitbox = transformComponent.hitboxes[0] as CircularHitbox;
   hitbox.radius -= 5 / Settings.TPS;
   if (hitbox.radius <= 0) {
      Board.destroyEntity(spit);
   }
   
   // @Incomplete: Shrinking the hitbox should make the hitboxes dirty, but hitboxes being dirty only has an impact on entities with a physics component.
   // Fundamental problem with the hitbox/dirty system.
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}