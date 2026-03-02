import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { registerDirtyEntity } from "../server/player-clients";
import { ComponentArray } from "./ComponentArray";
import { getPlantGrowthSpeed, plantIsFertilised } from "./PlanterBoxComponent";

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
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);

   const growthProgress = berryBushPlantedComponent.plantGrowthTicks / Vars.GROWTH_TIME_TICKS;
   packet.writeNumber(growthProgress);
   packet.writeNumber(berryBushPlantedComponent.numFruit);
}