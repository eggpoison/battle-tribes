import { ServerComponentType, Entity, Settings, CircularBox } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { destroyEntity } from "../world.js";

export class SpitPoisonAreaComponent {}

export const SpitPoisonAreaComponentArray = new ComponentArray<SpitPoisonAreaComponent>(ServerComponentType.spitPoisonArea, true, getDataLength, addDataToPacket);
SpitPoisonAreaComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(spit: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(spit);
   
   const hitbox = transformComponent.hitboxes[0];
   const box = hitbox.box as CircularBox;
   box.radius -= 5 * Settings.DT_S;
   if (box.radius <= 0) {
      destroyEntity(spit);
   }
   
   // @Incomplete: Shrinking the hitbox should make the hitboxes dirty, but hitboxes being dirty only has an impact on entities with a physics component.
   // Fundamental problem with the hitbox/dirty system.
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}