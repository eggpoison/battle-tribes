import { EntityType } from "../../../../shared/src/entities";
import { EntityClientComponentData } from "../networking/packet-snapshots";
import { ClientComponentType } from "./client-component-types";
import { BallistaFrostcicleComponentData, createBallistaFrostcicleComponentData } from "./client-components/BallistaFrostcicleComponent";
import { BallistaRockComponentData, createBallistaRockComponentData } from "./client-components/BallistaRockComponent";
import { BallistaSlimeballComponentData, createBallistaSlimeballComponentData } from "./client-components/BallistaSlimeballComponent";
import { BallistaWoodenBoltComponentData, createBallistaWoodenBoltComponentData } from "./client-components/BallistaWoodenBoltComponent";
import { createEmbrasureComponentData, EmbrasureComponentData } from "./client-components/EmbrasureComponent";
import { createEquipmentComponentData, EquipmentComponentData } from "./client-components/EquipmentComponent";
import { createFootprintComponentData, FootprintComponentData } from "./client-components/FootprintComponent";
import { createFrostshaperComponentData, FrostshaperComponentData } from "./client-components/FrostshaperComponent";
import { GlurbTailSegmentComponentData } from "./client-components/GlurbTailSegmentComponent";
import { createLilypadComponentData, LilypadComponentData } from "./client-components/LilypadComponent";
import { createRandomSoundComponentData, RandomSoundComponentData } from "./client-components/RandomSoundComponent";
import { createRegularSpikesComponentData, RegularSpikesComponentData } from "./client-components/RegularSpikesComponent";
import { createStonecarvingTableComponentData, StonecarvingTableComponentData } from "./client-components/StonecarvingTableComponent";
import { createThrownBattleaxeComponentData, ThrownBattleaxeComponentData } from "./client-components/ThrownBattleaxeComponent";
import { createWallComponentData, WallComponentData } from "./client-components/WallComponent";
import { createWarriorHutComponentData, WarriorHutComponentData } from "./client-components/WarriorHutComponent";
import { createWoodenArrowComponentData, WoodenArrowComponentData } from "./client-components/WoodenArrowComponent";
import { createWorkbenchComponentData, WorkbenchComponentData } from "./client-components/WorkbenchComponent";
import { createWorkerHutComponentData, WorkerHutComponentData } from "./client-components/WorkerHutComponent";

const ClientComponentDataRecord = {
   [ClientComponentType.equipment]: (): EquipmentComponentData => 0 as any,
   [ClientComponentType.footprint]: (): FootprintComponentData => 0 as any,
   [ClientComponentType.randomSound]: (): RandomSoundComponentData => 0 as any,
   [ClientComponentType.embrasure]: (): EmbrasureComponentData => 0 as any,
   [ClientComponentType.frostshaper]: (): FrostshaperComponentData => 0 as any,
   [ClientComponentType.lilypad]: (): LilypadComponentData => 0 as any,
   [ClientComponentType.regularSpikes]: (): RegularSpikesComponentData => 0 as any,
   [ClientComponentType.stonecarvingTable]: (): StonecarvingTableComponentData => 0 as any,
   [ClientComponentType.wall]: (): WallComponentData => 0 as any,
   [ClientComponentType.warriorHut]: (): WarriorHutComponentData => 0 as any,
   [ClientComponentType.workbench]: (): WorkbenchComponentData => 0 as any,
   [ClientComponentType.workerHut]: (): WorkerHutComponentData => 0 as any,
   [ClientComponentType.ballistaFrostcicle]: (): BallistaFrostcicleComponentData => 0 as any,
   [ClientComponentType.ballistaRock]: (): BallistaRockComponentData => 0 as any,
   [ClientComponentType.ballistaSlimeball]: (): BallistaSlimeballComponentData => 0 as any,
   [ClientComponentType.ballistaWoodenBolt]: (): BallistaWoodenBoltComponentData => 0 as any,
   [ClientComponentType.thrownBattleaxe]: (): ThrownBattleaxeComponentData => 0 as any,
   [ClientComponentType.woodenArrow]: (): WoodenArrowComponentData => 0 as any,
   [ClientComponentType.glurbTailSegment]: (): GlurbTailSegmentComponentData => 0 as any,
} satisfies Record<ClientComponentType, () => object>;

export type ClientComponentData<T extends ClientComponentType> = ReturnType<typeof ClientComponentDataRecord[T]>;

// @Cleanup: if this gets too large/unwieldy i should rework this
export function getEntityClientComponentConfigs(entityType: EntityType): EntityClientComponentData {
   switch (entityType) {
      case EntityType.cow: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentData(0.3, 20, 64, 5, 40, false)
         };
      }
      case EntityType.player: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentData(0.2, 20, 64, 4, 64, false),
            [ClientComponentType.equipment]: createEquipmentComponentData()
         };
      }
      case EntityType.tribeWorker: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentData(0.15, 20, 64, 4, 50, false),
            [ClientComponentType.equipment]: createEquipmentComponentData()
         };
      }
      case EntityType.tribeWarrior: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentData(0.15, 20, 64, 4, 64, false),
            [ClientComponentType.equipment]: createEquipmentComponentData()
         };
      }
      case EntityType.krumblid: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentData(0.3, 20, 64, 5, 50, false)
         };
      }
      case EntityType.lilypad: {
         return {
            [ClientComponentType.lilypad]: createLilypadComponentData()
         };
      }
      case EntityType.frostshaper: {
         return {
            [ClientComponentType.frostshaper]: createFrostshaperComponentData()
         };
      }
      case EntityType.embrasure: {
         return {
            [ClientComponentType.embrasure]: createEmbrasureComponentData()
         };
      }
      case EntityType.pebblum: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentData(0.3, 20, 64, 5, 40, false)
         };
      }
      case EntityType.wallSpikes:
      case EntityType.floorSpikes: {
         return {
            [ClientComponentType.regularSpikes]: createRegularSpikesComponentData()
         };
      }
      case EntityType.stonecarvingTable: {
         return {
            [ClientComponentType.stonecarvingTable]: createStonecarvingTableComponentData()
         };
      }
      case EntityType.wall: {
         return {
            [ClientComponentType.wall]: createWallComponentData()
         };
      }
      case EntityType.warriorHut: {
         return {
            [ClientComponentType.warriorHut]: createWarriorHutComponentData()
         };
      }
      case EntityType.workbench: {
         return {
            [ClientComponentType.workbench]: createWorkbenchComponentData()
         };
      }
      case EntityType.workerHut: {
         return {
            [ClientComponentType.workerHut]: createWorkerHutComponentData()
         };
      }
      case EntityType.yeti: {
         return {
            [ClientComponentType.randomSound]: createRandomSoundComponentData()
         };
      }
      case EntityType.ballistaFrostcicle: {
         return {
            [ClientComponentType.ballistaFrostcicle]: createBallistaFrostcicleComponentData()
         };
      }
      case EntityType.ballistaRock: {
         return {
            [ClientComponentType.ballistaRock]: createBallistaRockComponentData()
         };
      }
      case EntityType.ballistaSlimeball: {
         return {
            [ClientComponentType.ballistaSlimeball]: createBallistaSlimeballComponentData()
         };
      }
      case EntityType.ballistaWoodenBolt: {
         return {
            [ClientComponentType.ballistaWoodenBolt]: createBallistaWoodenBoltComponentData()
         };
      }
      case EntityType.battleaxeProjectile: {
         return {
            [ClientComponentType.thrownBattleaxe]: createThrownBattleaxeComponentData()
         };
      }
      case EntityType.woodenArrow: {
         return {
            [ClientComponentType.woodenArrow]: createWoodenArrowComponentData()
         };
      }
      case EntityType.glurbTailSegment: {
         return {
            [ClientComponentType.glurbTailSegment]: {}
         };
      }
      case EntityType.snobe: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentData(0.3, 20, 48, 5, 40, true),
            [ClientComponentType.randomSound]: createRandomSoundComponentData()
         };
      }
      case EntityType.snobe: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentData(0.3, 20, 64, 5, 40, false),
         };
      }
   }

   return {};
}