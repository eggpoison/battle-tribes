import { ServerComponentType } from "../../../shared/dist/components.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { randInt } from "../../../shared/dist/utils.js";
import { getEntityLayer } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { createIceShardExplosion } from "./IceSpikesComponent.js";
import { getPlantGrowthSpeed } from "./PlanterBoxComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";

const enum Vars {
   GROWTH_TIME_TICKS = 120 * Settings.TICK_RATE
}

export class IceSpikesPlantedComponent {
   public plantGrowthTicks = 0;
}

export const IceSpikesPlantedComponentArray = new ComponentArray<IceSpikesPlantedComponent>(ServerComponentType.iceSpikesPlanted, true, getDataLength, addDataToPacket);
IceSpikesPlantedComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
IceSpikesPlantedComponentArray.preRemove = preRemove;

export function plantedIceSpikesIsFullyGrown(entity: Entity): boolean {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);
   return iceSpikesPlantedComponent.plantGrowthTicks === Vars.GROWTH_TIME_TICKS;
}

function onTick(entity: Entity): void {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);

   iceSpikesPlantedComponent.plantGrowthTicks += getPlantGrowthSpeed(entity);
   if (iceSpikesPlantedComponent.plantGrowthTicks > Vars.GROWTH_TIME_TICKS) {
      iceSpikesPlantedComponent.plantGrowthTicks = Vars.GROWTH_TIME_TICKS;
   }
}

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);

   const growthProgress = iceSpikesPlantedComponent.plantGrowthTicks / Vars.GROWTH_TIME_TICKS;
   packet.writeNumber(growthProgress);
}

function preRemove(entity: Entity): void {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(entity);
   if (iceSpikesPlantedComponent.plantGrowthTicks === Vars.GROWTH_TIME_TICKS) {
      createIceShardExplosion(layer, hitbox.box.posX, hitbox.box.posY, randInt(2, 3));
   } else if (iceSpikesPlantedComponent.plantGrowthTicks >= Vars.GROWTH_TIME_TICKS * 0.5) {
      createIceShardExplosion(layer, hitbox.box.posX, hitbox.box.posY, randInt(1, 2));
   }
}