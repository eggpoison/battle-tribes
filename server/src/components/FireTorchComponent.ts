import { ServerComponentType, Entity, Settings, randFloat } from "battletribes-shared";
import { FIRE_TORCH_RADIUS } from "../entities/structures/fire-torch.js";
import { Light } from "../lights.js";
import { destroyEntity, getEntityAgeTicks, tickIntervalHasPassed } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";

export class FireTorchComponent {
   public readonly light: Light;

   constructor(light: Light) {
      this.light = light;
   }
}

export const FireTorchComponentArray = new ComponentArray<FireTorchComponent>(ServerComponentType.fireTorch, true, getDataLength, addDataToPacket);
FireTorchComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onTick(entity: Entity): void {
   if (tickIntervalHasPassed(0.15)) {
      // @Incomplete: not done in the server!
      const fireTorchComponent = FireTorchComponentArray.getComponent(entity);
      fireTorchComponent.light.radius = FIRE_TORCH_RADIUS + randFloat(-7, 7);
   }
   
   const age = getEntityAgeTicks(entity);
   // @Temporary
   // if (age >= 180 * Settings.TICK_RATE) {
   if (age >= 18000 * Settings.TICK_RATE) {
      destroyEntity(entity);
   }
}