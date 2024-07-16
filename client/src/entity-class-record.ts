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
import BallistaFrostcicle from "./projectiles/BallistaFrostcicle";
import BallistaSlimeball from "./projectiles/BallistaSlimeball";
import BallistaRock from "./projectiles/BallistaRock";
import SlingTurretRock from "./projectiles/SlingTurretRock";
import BallistaWoodenBolt from "./projectiles/BallistaWoodenBolt";

export type EntityClassType = new (position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) => Entity;

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
export function createEntity(entityData: EntityData): Entity {
   const id = entityData.id;
   const entityType = entityData.type;

   const componentDataRecord = createComponentDataRecord(entityData);
   
   switch (entityType) {
      case EntityType.cow: return new Cow(id, componentDataRecord);
      case EntityType.zombie: return new Zombie(id, componentDataRecord);
      case EntityType.tombstone: return new Tombstone(id, componentDataRecord);
      case EntityType.tree: return new Tree(id, componentDataRecord);
      case EntityType.workbench: return new Workbench(id);
      case EntityType.boulder: return new Boulder(id, componentDataRecord);
      case EntityType.berryBush: return new BerryBush(id, componentDataRecord);
      case EntityType.cactus: return new Cactus(id);
      case EntityType.yeti: return new Yeti(id);
      case EntityType.iceSpikes: return new IceSpikes(id);
      case EntityType.slime: return new Slime(id);
      case EntityType.slimewisp: return new Slimewisp(id);
      case EntityType.tribeWorker: return new TribeWorker(id, componentDataRecord);
      case EntityType.tribeWarrior: return new TribeWarrior(id, componentDataRecord);
      case EntityType.player: return new Player(id, componentDataRecord);
      case EntityType.tribeTotem: return new TribeTotem(id);
      case EntityType.workerHut: return new WorkerHut(id);
      case EntityType.warriorHut: return new WarriorHut(id);
      case EntityType.barrel: return new Barrel(id, componentDataRecord);
      case EntityType.campfire: return new Campfire(id, componentDataRecord);
      case EntityType.furnace: return new Furnace(id);
      case EntityType.snowball: return new Snowball(id, componentDataRecord);
      case EntityType.krumblid: return new Krumblid(id);
      case EntityType.frozenYeti: return new FrozenYeti(id);
      case EntityType.fish: return new Fish(id, componentDataRecord);
      case EntityType.itemEntity: return new ItemEntity(id, componentDataRecord);
      case EntityType.woodenArrow: return new WoodenArrowProjectile(id);
      case EntityType.ballistaWoodenBolt: return new BallistaWoodenBolt(id);
      case EntityType.ballistaRock: return new BallistaRock(id);
      case EntityType.ballistaSlimeball: return new BallistaSlimeball(id);
      case EntityType.ballistaFrostcicle: return new BallistaFrostcicle(id);
      case EntityType.slingTurretRock: return new SlingTurretRock(id);
      case EntityType.iceShardProjectile: return new IceShardsProjectile(id);
      case EntityType.rockSpikeProjectile: return new RockSpikeProjectile(id, componentDataRecord);
      case EntityType.spearProjectile: return new SpearProjectile(id, componentDataRecord);
      case EntityType.researchBench: return new ResearchBench(id, componentDataRecord);
      case EntityType.wall: return new Wall(id, componentDataRecord);
      case EntityType.slimeSpit: return new SlimeSpit(id, componentDataRecord);
      case EntityType.spitPoison: return new SpitPoison(id, componentDataRecord);
      case EntityType.door: return new Door(id, componentDataRecord);
      case EntityType.battleaxeProjectile: return new BattleaxeProjectile(id);
      case EntityType.golem: return new Golem(id);
      case EntityType.planterBox: return new PlanterBox(id, componentDataRecord);
      case EntityType.iceArrow: return new IceArrow(id);
      case EntityType.pebblum: return new Pebblum(id);
      case EntityType.embrasure: return new Embrasure(id, componentDataRecord);
      case EntityType.floorSpikes: return new Spikes(id, entityType, componentDataRecord);
      case EntityType.wallSpikes: return new Spikes(id, entityType, componentDataRecord);
      case EntityType.floorPunjiSticks: return new PunjiSticks(id, entityType, componentDataRecord);
      case EntityType.wallPunjiSticks: return new PunjiSticks(id, entityType, componentDataRecord);
      case EntityType.blueprintEntity: return new BlueprintEntity(id, componentDataRecord);
      case EntityType.ballista: return new Ballista(id);
      case EntityType.slingTurret: return new SlingTurret(id);
      case EntityType.tunnel: return new Tunnel(id, componentDataRecord);
      case EntityType.healingTotem: return new HealingTotem(id);
      case EntityType.plant: return new Plant(id, componentDataRecord);
      case EntityType.fence: return new Fence(id);
      case EntityType.fenceGate: return new FenceGate(id);
      case EntityType.frostshaper: return new Frostshaper(id);
      case EntityType.stonecarvingTable: return new StonecarvingTable(id);
      default: {
         const unreachable: never = entityType;
         return unreachable;
      }
   }
}