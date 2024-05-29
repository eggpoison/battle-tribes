import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Boulder from "./entities/Boulder";
import Cow from "./entities/Cow";
import Player from "./entities/Player";
import Tombstone from "./entities/Tombstone";
import Tree from "./entities/Tree";
import Workbench from "./entities/Workbench";
import Zombie from "./entities/Zombie";
import BerryBush from "./entities/BerryBush";
import Cactus from "./entities/Cactus";
import Yeti from "./entities/Yeti";
import IceSpikes from "./entities/IceSpikes";
import Slime from "./entities/Slime";
import Slimewisp from "./entities/Slimewisp";
import TribeTotem from "./entities/TribeTotem";
import WorkerHut from "./entities/WorkerHut";
import Barrel from "./entities/Barrel";
import Campfire from "./entities/Campfire";
import Furnace from "./entities/Furnace";
import Snowball from "./entities/Snowball";
import Krumblid from "./entities/Krumblid";
import FrozenYeti from "./entities/FrozenYeti";
import Fish from "./entities/Fish";
import ItemEntity from "./entities/ItemEntity";
import Entity, { ComponentDataRecord } from "./Entity";
import WoodenArrowProjectile from "./projectiles/WoodenArrowProjectile";
import IceShardsProjectile from "./projectiles/IceShardsProjectile";
import RockSpikeProjectile from "./projectiles/RockSpikeProjectile";
import SpearProjectile from "./projectiles/SpearProjectile";
import ResearchBench from "./entities/ResearchBench";
import WarriorHut from "./entities/WarriorHut";
import TribeWorker from "./entities/TribeWorker";
import TribeWarrior from "./entities/TribeWarrior";
import Wall from "./entities/Wall";
import SlimeSpit from "./projectiles/SlimeSpit";
import SpitPoison from "./projectiles/SpitPoison";
import Door from "./entities/Door";
import BattleaxeProjectile from "./projectiles/BattleaxeProjectile";
import Golem from "./entities/Golem";
import PlanterBox from "./entities/PlanterBox";
import IceArrow from "./projectiles/IceArrow";
import Pebblum from "./entities/Pebblum";
import Embrasure from "./entities/Embrasure";
import Spikes from "./entities/Spikes";
import PunjiSticks from "./entities/PunjiSticks";
import BlueprintEntity from "./entities/BlueprintEntity";
import Ballista from "./entities/Ballista";
import SlingTurret from "./entities/SlingTurret";
import Tunnel from "./entities/Tunnel";
import HealingTotem from "./entities/HealingTotem";
import Plant from "./entities/Plant";
import Fence from "./entities/Fence";
import FenceGate from "./entities/FenceGate";
import { EntityData } from "webgl-test-shared/dist/client-server-types";
import Frostshaper from "./entities/Frostshaper";
import StonecarvingTable from "./entities/StonecarvingTable";

export type EntityClassType<T extends EntityType> = new (position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) => Entity;

const createComponentDataRecord = (entityData: EntityData): ComponentDataRecord => {
   const componentDataRecord: ComponentDataRecord = {};

   for (let i = 0; i < entityData.components.length; i++) {
      const componentData = entityData.components[i];

      // @Cleanup: AWFUL CAST
      componentDataRecord[componentData.componentType] = componentData as any;
   }

   return componentDataRecord;
}

// @Cleanup: remove this and just have entities be a collection of components
export function createEntity<T extends EntityType>(entityData: EntityData<T>): Entity {
   const position = Point.unpackage(entityData.position);
   const id = entityData.id;
   const ageTicks = entityData.ageTicks;
   const entityType = entityData.type;

   const componentDataRecord = createComponentDataRecord(entityData);
   
   switch (entityType) {
      case EntityType.cow: return new Cow(position, id, ageTicks, componentDataRecord);
      case EntityType.zombie: return new Zombie(position, id, ageTicks, componentDataRecord);
      case EntityType.tombstone: return new Tombstone(position, id, ageTicks, componentDataRecord);
      case EntityType.tree: return new Tree(position, id, ageTicks, componentDataRecord);
      case EntityType.workbench: return new Workbench(position, id, ageTicks);
      case EntityType.boulder: return new Boulder(position, id, ageTicks, componentDataRecord);
      case EntityType.berryBush: return new BerryBush(position, id, ageTicks, componentDataRecord);
      case EntityType.cactus: return new Cactus(position, id, ageTicks);
      case EntityType.yeti: return new Yeti(position, id, ageTicks);
      case EntityType.iceSpikes: return new IceSpikes(position, id, ageTicks);
      case EntityType.slime: return new Slime(position, id, ageTicks);
      case EntityType.slimewisp: return new Slimewisp(position, id, ageTicks);
      case EntityType.tribeWorker: return new TribeWorker(position, id, ageTicks, componentDataRecord);
      case EntityType.tribeWarrior: return new TribeWarrior(position, id, ageTicks, componentDataRecord);
      case EntityType.player: return new Player(position, id, ageTicks, componentDataRecord);
      case EntityType.tribeTotem: return new TribeTotem(position, id, ageTicks);
      case EntityType.workerHut: return new WorkerHut(position, id, ageTicks);
      case EntityType.warriorHut: return new WarriorHut(position, id, ageTicks);
      case EntityType.barrel: return new Barrel(position, id, ageTicks);
      case EntityType.campfire: return new Campfire(position, id, ageTicks);
      case EntityType.furnace: return new Furnace(position, id, ageTicks);
      case EntityType.snowball: return new Snowball(position, id, ageTicks, componentDataRecord);
      case EntityType.krumblid: return new Krumblid(position, id, ageTicks);
      case EntityType.frozenYeti: return new FrozenYeti(position, id, ageTicks);
      case EntityType.fish: return new Fish(position, id, ageTicks, componentDataRecord);
      case EntityType.itemEntity: return new ItemEntity(position, id, ageTicks, componentDataRecord);
      case EntityType.woodenArrowProjectile: return new WoodenArrowProjectile(position, id, ageTicks, componentDataRecord);
      case EntityType.iceShardProjectile: return new IceShardsProjectile(position, id, ageTicks);
      case EntityType.rockSpikeProjectile: return new RockSpikeProjectile(position, id, ageTicks, componentDataRecord);
      case EntityType.spearProjectile: return new SpearProjectile(position, id, ageTicks);
      case EntityType.researchBench: return new ResearchBench(position, id, ageTicks);
      case EntityType.wall: return new Wall(position, id, ageTicks, componentDataRecord);
      case EntityType.slimeSpit: return new SlimeSpit(position, id, ageTicks);
      case EntityType.spitPoison: return new SpitPoison(position, id, ageTicks);
      case EntityType.door: return new Door(position, id, ageTicks, componentDataRecord);
      case EntityType.battleaxeProjectile: return new BattleaxeProjectile(position, id, ageTicks);
      case EntityType.golem: return new Golem(position, id, ageTicks);
      case EntityType.planterBox: return new PlanterBox(position, id, ageTicks);
      case EntityType.iceArrow: return new IceArrow(position, id, ageTicks);
      case EntityType.pebblum: return new Pebblum(position, id, ageTicks);
      case EntityType.embrasure: return new Embrasure(position, id, ageTicks, componentDataRecord);
      case EntityType.floorSpikes: return new Spikes(position, id, ageTicks, entityType, componentDataRecord);
      case EntityType.wallSpikes: return new Spikes(position, id, ageTicks, entityType, componentDataRecord);
      case EntityType.floorPunjiSticks: return new PunjiSticks(position, id, ageTicks, entityType);
      case EntityType.wallPunjiSticks: return new PunjiSticks(position, id, ageTicks, entityType);
      case EntityType.blueprintEntity: return new BlueprintEntity(position, id, ageTicks, componentDataRecord);
      case EntityType.ballista: return new Ballista(position, id, ageTicks);
      case EntityType.slingTurret: return new SlingTurret(position, id, ageTicks);
      case EntityType.tunnel: return new Tunnel(position, id, ageTicks, componentDataRecord);
      case EntityType.healingTotem: return new HealingTotem(position, id, ageTicks);
      case EntityType.plant: return new Plant(position, id, ageTicks);
      case EntityType.fence: return new Fence(position, id, ageTicks);
      case EntityType.fenceGate: return new FenceGate(position, id, ageTicks);
      case EntityType.frostshaper: return new Frostshaper(position, id, ageTicks);
      case EntityType.stonecarvingTable: return new StonecarvingTable(position, id, ageTicks);
      default: {
         const unreachable: never = entityType;
         return unreachable;
      }
   }
}