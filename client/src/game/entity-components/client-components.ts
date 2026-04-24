import { EntityType } from "webgl-test-shared";
import { createBallistaFrostcicleComponentData } from "./client-components/BallistaFrostcicleComponent";
import { createBallistaRockComponentData } from "./client-components/BallistaRockComponent";
import { createBallistaSlimeballComponentData } from "./client-components/BallistaSlimeballComponent";
import { createBallistaWoodenBoltComponentData } from "./client-components/BallistaWoodenBoltComponent";
import { createEmbrasureComponentData } from "./client-components/EmbrasureComponent";
import { createEquipmentComponentData } from "./client-components/EquipmentComponent";
import { createFootprintComponentData } from "./client-components/FootprintComponent";
import { createFrostshaperComponentData } from "./client-components/FrostshaperComponent";
import { createLilypadComponentData } from "./client-components/LilypadComponent";
import { createRandomSoundComponentData } from "./client-components/RandomSoundComponent";
import { createRegularSpikesComponentData } from "./client-components/RegularSpikesComponent";
import { createStonecarvingTableComponentData } from "./client-components/StonecarvingTableComponent";
import { createThrownBattleaxeComponentData } from "./client-components/ThrownBattleaxeComponent";
import { createWallComponentData } from "./client-components/WallComponent";
import { createWarriorHutComponentData } from "./client-components/WarriorHutComponent";
import { createWoodenArrowComponentData } from "./client-components/WoodenArrowComponent";
import { createWorkbenchComponentData } from "./client-components/WorkbenchComponent";
import { createWorkerHutComponentData } from "./client-components/WorkerHutComponent";
import { ClientComponentDataMap } from "./component-types";

export function getEntityClientComponentConfigs<T extends EntityType>(entityType: T): ClientComponentDataMap[T] {
   // @CLEANUP typescript lacks return type narrowing for now so there are nasty any casts strewn aboudst
   
   switch (entityType) {
      case EntityType.cow: {
         return [
            createFootprintComponentData(0.3, 20, 64, 5, 40, false)
         ] as any;
      }
      case EntityType.player: {
         return [
            createFootprintComponentData(0.2, 20, 64, 4, 64, false),
            createEquipmentComponentData()
         ] as any;
      }
      case EntityType.tribeWorker: {
         return [
            createFootprintComponentData(0.15, 20, 64, 4, 50, false),
            createEquipmentComponentData()
         ] as any;
      }
      case EntityType.tribeWarrior: {
         return [
            createFootprintComponentData(0.15, 20, 64, 4, 64, false),
            createEquipmentComponentData()
         ] as any;
      }
      case EntityType.krumblid: {
         return [
            createFootprintComponentData(0.3, 20, 64, 5, 50, false)
         ] as any;
      }
      case EntityType.lilypad: {
         return [
            createLilypadComponentData()
         ] as any;
      }
      case EntityType.frostshaper: {
         return [
            createFrostshaperComponentData()
         ] as any;
      }
      case EntityType.embrasure: {
         return [
            createEmbrasureComponentData()
         ] as any;
      }
      case EntityType.pebblum: {
         return [
            createFootprintComponentData(0.3, 20, 64, 5, 40, false)
         ] as any;
      }
      case EntityType.wallSpikes:
      case EntityType.floorSpikes: {
         return [
            createRegularSpikesComponentData()
         ] as any;
      }
      case EntityType.stonecarvingTable: {
         return [
            createStonecarvingTableComponentData()
         ] as any;
      }
      case EntityType.wall: {
         return [
            createWallComponentData()
         ] as any;
      }
      case EntityType.warriorHut: {
         return [
            createWarriorHutComponentData()
         ] as any;
      }
      case EntityType.workbench: {
         return [
            createWorkbenchComponentData()
         ] as any;
      }
      case EntityType.workerHut: {
         return [
            createWorkerHutComponentData()
         ] as any;
      }
      case EntityType.yeti: {
         return [
            createRandomSoundComponentData()
         ] as any;
      }
      case EntityType.ballistaFrostcicle: {
         return [
            createBallistaFrostcicleComponentData()
         ] as any;
      }
      case EntityType.ballistaRock: {
         return [
            createBallistaRockComponentData()
         ] as any;
      }
      case EntityType.ballistaSlimeball: {
         return [
            createBallistaSlimeballComponentData()
         ] as any;
      }
      case EntityType.ballistaWoodenBolt: {
         return [
            createBallistaWoodenBoltComponentData()
         ] as any;
      }
      case EntityType.battleaxeProjectile: {
         return [
            createThrownBattleaxeComponentData()
         ] as any;
      }
      case EntityType.woodenArrow: {
         return [
            createWoodenArrowComponentData()
         ] as any;
      }
      case EntityType.glurbTailSegment: {
         return [
            {}
         ] as any;
      }
      case EntityType.snobe: {
         return [
            createFootprintComponentData(0.3, 20, 48, 5, 40, true),
            createRandomSoundComponentData()
         ] as any;
      }
      // @Cleanup: doubled. i think this is supposed to be a different entity??
      // case EntityType.snobe: {
      //    clientComponentData.push(createFootprintComponentData(0.3, 20, 64, 5, 40, false));
      //    break;
      // }
      default: {
         return [] as any;
      }
   }
}