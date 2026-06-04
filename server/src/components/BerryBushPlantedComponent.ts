import { ServerComponentType } from "../../../shared/dist/components.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Settings } from "../../../shared/dist/settings.js";
import { registerDirtyEntity } from "../server/player-clients.js";
import { ComponentArray } from "./ComponentArray.js";
import { getPlantGrowthSpeed, plantIsFertilised } from "./PlanterBoxComponent.js";

const enum Vars {
   // @SQUEAM for da shot
   GROWTH_TIME_TICKS = 60 * Settings.TICK_RATE
   // GROWTH_TIME_TICKS = 6000 * Settings.TICK_RATE
}

export class BerryBushPlantedComponent {
   public plantGrowthTicks = 0;

   public numFruit = 0;
   public fruitRandomGrowthTicks = 0;
}

export const BerryBushPlantedComponentArray = new ComponentArray<BerryBushPlantedComponent>(ServerComponentType.berryBushPlanted, true, getDataLength, addDataToPacket);
BerryBushPlantedComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);

   berryBushPlantedComponent.plantGrowthTicks += getPlantGrowthSpeed(entity);
   if (berryBushPlantedComponent.plantGrowthTicks > Vars.GROWTH_TIME_TICKS) {
      berryBushPlantedComponent.plantGrowthTicks = Vars.GROWTH_TIME_TICKS;

      if (berryBushPlantedComponent.numFruit < 4) {
         const tickChance = plantIsFertilised(entity) ? 0.45 : 0.3;
         
         // Grow fruit
         // @SQUEAM @TEMPORARY
         // if (Math.random() < tickChance * Settings.DT_S) {
         //    berryBushPlantedComponent.fruitRandomGrowthTicks++;
         //    if (berryBushPlantedComponent.fruitRandomGrowthTicks === 5) {
         //       berryBushPlantedComponent.numFruit++;
         //       berryBushPlantedComponent.fruitRandomGrowthTicks = 0;
         //    }
         // }
      }
   }

   // @Speed: only need to send when the growth state changes or it grows a berry
   registerDirtyEntity(entity);
}

function getDataLength(): number {
   return 2 * Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);

   const growthProgress = berryBushPlantedComponent.plantGrowthTicks / Vars.GROWTH_TIME_TICKS;
   packet.writeNumber(growthProgress);
   packet.writeNumber(berryBushPlantedComponent.numFruit);
}