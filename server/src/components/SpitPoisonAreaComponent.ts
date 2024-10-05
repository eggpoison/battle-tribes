import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TransformComponentArray } from "./TransformComponent";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { destroyEntity } from "../world";

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
   
   const hitbox = transformComponent.hitboxes[0];
   const box = hitbox.box as CircularBox;
   box.radius -= 5 / Settings.TPS;
   if (box.radius <= 0) {
      destroyEntity(spit);
   }
   
   // @Incomplete: Shrinking the hitbox should make the hitboxes dirty, but hitboxes being dirty only has an impact on entities with a physics component.
   // Fundamental problem with the hitbox/dirty system.
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}