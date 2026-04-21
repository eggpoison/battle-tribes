import { EntityType } from "webgl-test-shared";
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
import { EntityClientComponentData } from "../entity-component-types";

interface ClientComponentDataRecord {
   [ClientComponentType.equipment]: EquipmentComponentData,
   [ClientComponentType.footprint]: FootprintComponentData,
   [ClientComponentType.randomSound]: RandomSoundComponentData,
   [ClientComponentType.embrasure]: EmbrasureComponentData,
   [ClientComponentType.frostshaper]: FrostshaperComponentData,
   [ClientComponentType.lilypad]: LilypadComponentData,
   [ClientComponentType.regularSpikes]: RegularSpikesComponentData,
   [ClientComponentType.stonecarvingTable]: StonecarvingTableComponentData,
   [ClientComponentType.wall]: WallComponentData,
   [ClientComponentType.warriorHut]: WarriorHutComponentData,
   [ClientComponentType.workbench]: WorkbenchComponentData,
   [ClientComponentType.workerHut]: WorkerHutComponentData,
   [ClientComponentType.ballistaFrostcicle]: BallistaFrostcicleComponentData,
   [ClientComponentType.ballistaRock]: BallistaRockComponentData,
   [ClientComponentType.ballistaSlimeball]: BallistaSlimeballComponentData,
   [ClientComponentType.ballistaWoodenBolt]: BallistaWoodenBoltComponentData,
   [ClientComponentType.thrownBattleaxe]: ThrownBattleaxeComponentData,
   [ClientComponentType.woodenArrow]: WoodenArrowComponentData,
   [ClientComponentType.glurbTailSegment]: GlurbTailSegmentComponentData
}

export type ClientComponentData<T extends ClientComponentType> = ClientComponentDataRecord[T];

// @Cleanup: if this gets too large/unwieldy i should rework this
export function getEntityClientComponentConfigs(entityType: EntityType): EntityClientComponentData {
   const clientComponentData: Array<ClientComponentData<ClientComponentType>> = [];
   
   switch (entityType) {
      case EntityType.cow: {
         clientComponentData.push(createFootprintComponentData(0.3, 20, 64, 5, 40, false));
         break;
      }
      case EntityType.player: {
         clientComponentData.push(createFootprintComponentData(0.2, 20, 64, 4, 64, false));
         clientComponentData.push(createEquipmentComponentData());
         break;
      }
      case EntityType.tribeWorker: {
         clientComponentData.push(createFootprintComponentData(0.15, 20, 64, 4, 50, false));
         clientComponentData.push(createEquipmentComponentData());
         break;
      }
      case EntityType.tribeWarrior: {
         clientComponentData.push(createFootprintComponentData(0.15, 20, 64, 4, 64, false));
         clientComponentData.push(createEquipmentComponentData());
         break;
      }
      case EntityType.krumblid: {
         clientComponentData.push(createFootprintComponentData(0.3, 20, 64, 5, 50, false));
         break;
      }
      case EntityType.lilypad: {
         clientComponentData.push(createLilypadComponentData());
         break;
      }
      case EntityType.frostshaper: {
         clientComponentData.push(createFrostshaperComponentData());
         break;
      }
      case EntityType.embrasure: {
         clientComponentData.push(createEmbrasureComponentData());
         break;
      }
      case EntityType.pebblum: {
         clientComponentData.push(createFootprintComponentData(0.3, 20, 64, 5, 40, false));
         break;
      }
      case EntityType.wallSpikes:
      case EntityType.floorSpikes: {
         clientComponentData.push(createRegularSpikesComponentData());
         break;
      }
      case EntityType.stonecarvingTable: {
         clientComponentData.push(createStonecarvingTableComponentData());
         break;
      }
      case EntityType.wall: {
         clientComponentData.push(createWallComponentData());
         break;
      }
      case EntityType.warriorHut: {
         clientComponentData.push(createWarriorHutComponentData());
         break;
      }
      case EntityType.workbench: {
         clientComponentData.push(createWorkbenchComponentData());
         break;
      }
      case EntityType.workerHut: {
         clientComponentData.push(createWorkerHutComponentData());
         break;
      }
      case EntityType.yeti: {
         clientComponentData.push(createRandomSoundComponentData());
         break;
      }
      case EntityType.ballistaFrostcicle: {
         clientComponentData.push(createBallistaFrostcicleComponentData());
         break;
      }
      case EntityType.ballistaRock: {
         clientComponentData.push(createBallistaRockComponentData());
         break;
      }
      case EntityType.ballistaSlimeball: {
         clientComponentData.push(createBallistaSlimeballComponentData());
         break;
      }
      case EntityType.ballistaWoodenBolt: {
         clientComponentData.push(createBallistaWoodenBoltComponentData());
         break;
      }
      case EntityType.battleaxeProjectile: {
         clientComponentData.push(createThrownBattleaxeComponentData());
         break;
      }
      case EntityType.woodenArrow: {
         clientComponentData.push(createWoodenArrowComponentData());
         break;
      }
      case EntityType.glurbTailSegment: {
         clientComponentData.push({});
         break;
      }
      case EntityType.snobe: {
         clientComponentData.push(createFootprintComponentData(0.3, 20, 48, 5, 40, true));
         clientComponentData.push(createRandomSoundComponentData());
         break;
      }
      // @Cleanup: doubled. i think this is supposed to be a different entity??
      // case EntityType.snobe: {
      //    clientComponentData.push(createFootprintComponentData(0.3, 20, 64, 5, 40, false));
      //    break;
      // }
   }

   return clientComponentData;
}