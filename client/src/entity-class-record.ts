import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
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
import ItemEntity from "./items/ItemEntity";
import Entity from "./Entity";
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

export type EntityClassType<T extends EntityType> = new (position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<T>) => Entity;

// @Incomplete: Move to server-like system
const ENTITY_CLASS_RECORD: { [E in EntityType]: () => EntityClassType<E>} = {
   [EntityType.cow]: () => Cow,
   [EntityType.zombie]: () => Zombie,
   [EntityType.tombstone]: () => Tombstone,
   [EntityType.tree]: () => Tree,
   [EntityType.workbench]: () => Workbench,
   [EntityType.boulder]: () => Boulder,
   [EntityType.berryBush]: () => BerryBush,
   [EntityType.cactus]: () => Cactus,
   [EntityType.yeti]: () => Yeti,
   [EntityType.iceSpikes]: () => IceSpikes,
   [EntityType.slime]: () => Slime,
   [EntityType.slimewisp]: () => Slimewisp,
   [EntityType.tribeWorker]: () => TribeWorker,
   [EntityType.tribeWarrior]: () => TribeWarrior,
   [EntityType.player]: () => Player,
   [EntityType.tribeTotem]: () => TribeTotem,
   [EntityType.workerHut]: () => WorkerHut,
   [EntityType.warriorHut]: () => WarriorHut,
   [EntityType.barrel]: () => Barrel,
   [EntityType.campfire]: () => Campfire,
   [EntityType.furnace]: () => Furnace,
   [EntityType.snowball]: () => Snowball,
   [EntityType.krumblid]: () => Krumblid,
   [EntityType.frozenYeti]: () => FrozenYeti,
   [EntityType.fish]: () => Fish,
   [EntityType.itemEntity]: () => ItemEntity,
   [EntityType.woodenArrowProjectile]: () => WoodenArrowProjectile,
   [EntityType.iceShardProjectile]: () => IceShardsProjectile,
   [EntityType.rockSpikeProjectile]: () => RockSpikeProjectile,
   [EntityType.spearProjectile]: () => SpearProjectile,
   [EntityType.researchBench]: () => ResearchBench,
   [EntityType.wall]: () => Wall,
   [EntityType.slimeSpit]: () => SlimeSpit,
   [EntityType.spitPoison]: () => SpitPoison,
   [EntityType.door]: () => Door,
   [EntityType.battleaxeProjectile]: () => BattleaxeProjectile,
   [EntityType.golem]: () => Golem,
   [EntityType.planterBox]: () => PlanterBox,
   [EntityType.iceArrow]: () => IceArrow,
   [EntityType.pebblum]: () => Pebblum,
   [EntityType.embrasure]: () => Embrasure,
   [EntityType.floorSpikes]: () => Spikes,
   [EntityType.wallSpikes]: () => Spikes,
   [EntityType.floorPunjiSticks]: () => PunjiSticks,
   [EntityType.wallPunjiSticks]: () => PunjiSticks,
   [EntityType.blueprintEntity]: () => BlueprintEntity,
   [EntityType.ballista]: () => Ballista,
   [EntityType.slingTurret]: () => SlingTurret,
   [EntityType.tunnel]: () => Tunnel,
   [EntityType.healingTotem]: () => HealingTotem,
   [EntityType.plant]: () => Plant,
   [EntityType.fence]: () => Fence,
   [EntityType.fenceGate]: () => FenceGate
};

export default ENTITY_CLASS_RECORD;