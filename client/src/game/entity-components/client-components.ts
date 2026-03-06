import { EntityType } from "webgl-test-shared";
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
   const clientComponentData = new Array<ClientComponentData<ClientComponentType>>();
   
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
      case EntityType.snobe: {
         clientComponentData.push(createFootprintComponentData(0.3, 20, 64, 5, 40, false));
         break;
      }
   }

   return clientComponentData;
}