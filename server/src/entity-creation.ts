import { EntityType } from "battletribes-shared/entities";
import { ComponentConfig } from "./components";
import { createBerryBushConfig } from "./entities/resources/berry-bush";
import { createBoulderConfig } from "./entities/resources/boulder";
import { createCactusConfig } from "./entities/resources/cactus";
import { createCowConfig } from "./entities/mobs/cow";
import { createFishConfig } from "./entities/mobs/fish";
import { createFrozenYetiConfig } from "./entities/mobs/frozen-yeti";
import { createIceSpikesConfig } from "./entities/resources/ice-spikes";
import { createKrumblidConfig } from "./entities/mobs/krumblid";
import { createSlimeConfig } from "./entities/mobs/slime";
import { createSlimewispConfig } from "./entities/mobs/slimewisp";
import { createSnowballConfig } from "./entities/snowball";
import { createTombstoneConfig } from "./entities/tombstone";
import { createTreeConfig } from "./entities/resources/tree";
import { createYetiConfig } from "./entities/mobs/yeti";
import { createZombieConfig } from "./entities/mobs/zombie";
import { createSpitPoisonAreaConfig } from "./entities/projectiles/spit-poison-area";
import { createGolemConfig } from "./entities/mobs/golem";
import { createPebblumConfig } from "./entities/mobs/pebblum";
import { createTribeWorkerConfig } from "./entities/tribes/tribe-worker";
import { createFenceConfig } from "./entities/structures/fence";
import { createFenceGateConfig } from "./entities/structures/fence-gate";
import { createPlantConfig } from "./entities/plant";
import { createPlanterBoxConfig } from "./entities/structures/planter-box";
import { createFurnaceConfig } from "./entities/structures/cooking-entities/furnace";
import { createCampfireConfig } from "./entities/structures/cooking-entities/campfire";
import { createWorkbenchConfig } from "./entities/structures/workbench";
import { createFloorSpikesConfig, createWallSpikesConfig } from "./entities/structures/spikes";
import { createFloorPunjiSticksConfig, createWallPunjiSticksConfig } from "./entities/structures/punji-sticks";
import { createBallistaConfig } from "./entities/structures/ballista";
import { createSlingTurretConfig } from "./entities/structures/sling-turret";
import { createWallConfig } from "./entities/structures/wall";
import { createDoorConfig } from "./entities/structures/door";
import { createEmbrasureConfig } from "./entities/structures/embrasure";
import { createTunnelConfig } from "./entities/structures/tunnel";
import { createSlimeSpitConfig } from "./entities/projectiles/slime-spit";
import { createWoodenArrowConfig } from "./entities/projectiles/wooden-arrow";
import { createIceArrowConfig } from "./entities/projectiles/ice-arrow";
import { createPlayerConfig } from "./entities/tribes/player";
import { createIceShardConfig } from "./entities/projectiles/ice-shard";
import { createRockSpikeConfig } from "./entities/projectiles/rock-spike";
import { createSpearProjectileConfig } from "./entities/projectiles/spear-projectile";
import { createBattleaxeProjectileConfig } from "./entities/projectiles/battleaxe-projectile";
import { createBarrelConfig } from "./entities/structures/barrel";
import { createTribeWarriorConfig } from "./entities/tribes/tribe-warrior";
import { createTribeTotemConfig } from "./entities/structures/tribe-totem";
import { createWorkerHutConfig } from "./entities/structures/worker-hut";
import { createWarriorHutConfig } from "./entities/structures/warrior-hut";
import { createBlueprintEntityConfig } from "./entities/blueprint-entity";
import { createResearchBenchConfig } from "./entities/structures/research-bench";
import { createHealingTotemConfig } from "./entities/structures/healing-totem";
import { createFrostshaperConfig } from "./entities/structures/frostshaper";
import { createStonecarvingTableConfig } from "./entities/structures/stonecarving-table";
import { createItemEntityConfig } from "./entities/item-entity";
import { createBallistaWoodenBoltConfig } from "./entities/projectiles/ballista-wooden-bolt";
import { createBallistaRockConfig } from "./entities/projectiles/ballista-rock";
import { createBallistaSlimeballConfig } from "./entities/projectiles/ballista-slimeball";
import { createBallistaFrostcicleConfig } from "./entities/projectiles/ballista-frostcicle";
import { createSlingTurretRockConfig } from "./entities/projectiles/sling-turret-rock";
import { ServerComponentType } from "battletribes-shared/components";
import { createGrassStrandConfig } from "./entities/grass-strand";
import { createDecorationConfig } from "./entities/decoration";
import { createReedConfig } from "./entities/reed";
import { createLilypadConfig } from "./entities/lilypad";
import { createFibrePlantConfig } from "./entities/resources/fibre-plant";
import { createGuardianConfig } from "./entities/mobs/guardian";
import { createGuardianGemQuakeConfig } from "./entities/guardian-gem-quake";
import { createGuardianGemFragmentProjectileConfig } from "./entities/projectiles/guardian-gem-fragment-projectile";
import { createGuardianSpikyBallConfig } from "./entities/projectiles/guardian-spiky-ball";

// @Robustness: from the given entity type, deduce which component params will be returned.
// - Will require defining the component configs in a variable to be analysed at compile-time, not in functions
export function createEntityConfig(entityType: EntityType): ComponentConfig<ServerComponentType> {
   // @Cleanup: so many stupid casts!
   switch (entityType) {
      case EntityType.berryBush: return createBerryBushConfig() as any;
      case EntityType.boulder: return createBoulderConfig() as any;
      case EntityType.cactus: return createCactusConfig() as any;
      case EntityType.cow: return createCowConfig() as any;
      case EntityType.fish: return createFishConfig() as any;
      case EntityType.frozenYeti: return createFrozenYetiConfig() as any;
      case EntityType.iceSpikes: return createIceSpikesConfig() as any;
      case EntityType.krumblid: return createKrumblidConfig() as any;
      case EntityType.slime: return createSlimeConfig() as any;
      case EntityType.slimewisp: return createSlimewispConfig() as any;
      case EntityType.snowball: return createSnowballConfig() as any;
      case EntityType.tombstone: return createTombstoneConfig() as any;
      case EntityType.tree: return createTreeConfig() as any;
      case EntityType.yeti: return createYetiConfig() as any;
      case EntityType.zombie: return createZombieConfig() as any;
      case EntityType.spitPoisonArea: return createSpitPoisonAreaConfig() as any;
      case EntityType.golem: return createGolemConfig() as any;
      case EntityType.pebblum: return createPebblumConfig() as any;
      case EntityType.tribeWorker: return createTribeWorkerConfig() as any;
      case EntityType.fence: return createFenceConfig() as any;
      case EntityType.fenceGate: return createFenceGateConfig() as any;
      case EntityType.plant: return createPlantConfig() as any;
      case EntityType.planterBox: return createPlanterBoxConfig() as any;
      case EntityType.furnace: return createFurnaceConfig() as any;
      case EntityType.campfire: return createCampfireConfig() as any;
      case EntityType.workbench: return createWorkbenchConfig() as any;
      case EntityType.floorSpikes: return createFloorSpikesConfig() as any;
      case EntityType.wallSpikes: return createWallSpikesConfig() as any;
      case EntityType.floorPunjiSticks: return createFloorPunjiSticksConfig() as any;
      case EntityType.wallPunjiSticks: return createWallPunjiSticksConfig() as any;
      case EntityType.ballista: return createBallistaConfig() as any;
      case EntityType.slingTurret: return createSlingTurretConfig() as any;
      case EntityType.wall: return createWallConfig() as any;
      case EntityType.door: return createDoorConfig() as any;
      case EntityType.embrasure: return createEmbrasureConfig() as any;
      case EntityType.tunnel: return createTunnelConfig() as any;
      case EntityType.slimeSpit: return createSlimeSpitConfig() as any;
      case EntityType.woodenArrow: return createWoodenArrowConfig() as any;
      case EntityType.ballistaWoodenBolt: return createBallistaWoodenBoltConfig() as any;
      case EntityType.ballistaRock: return createBallistaRockConfig() as any;
      case EntityType.ballistaSlimeball: return createBallistaSlimeballConfig() as any;
      case EntityType.ballistaFrostcicle: return createBallistaFrostcicleConfig() as any;
      case EntityType.slingTurretRock: return createSlingTurretRockConfig() as any;
      case EntityType.iceArrow: return createIceArrowConfig() as any;
      case EntityType.player: return createPlayerConfig() as any;
      case EntityType.iceShardProjectile: return createIceShardConfig() as any;
      case EntityType.rockSpikeProjectile: return createRockSpikeConfig() as any;
      case EntityType.spearProjectile: return createSpearProjectileConfig() as any;
      case EntityType.battleaxeProjectile: return createBattleaxeProjectileConfig() as any;
      case EntityType.barrel: return createBarrelConfig() as any;
      case EntityType.tribeWarrior: return createTribeWarriorConfig() as any;
      case EntityType.tribeTotem: return createTribeTotemConfig() as any;
      case EntityType.workerHut: return createWorkerHutConfig() as any;
      case EntityType.warriorHut: return createWarriorHutConfig() as any;
      case EntityType.blueprintEntity: return createBlueprintEntityConfig() as any;
      case EntityType.researchBench: return createResearchBenchConfig() as any;
      case EntityType.healingTotem: return createHealingTotemConfig() as any;
      case EntityType.frostshaper: return createFrostshaperConfig() as any;
      case EntityType.stonecarvingTable: return createStonecarvingTableConfig() as any;
      case EntityType.itemEntity: return createItemEntityConfig() as any;
      case EntityType.grassStrand: return createGrassStrandConfig() as any;
      case EntityType.decoration: return createDecorationConfig() as any;
      case EntityType.reed: return createReedConfig() as any;
      case EntityType.lilypad: return createLilypadConfig() as any;
      case EntityType.fibrePlant: return createFibrePlantConfig() as any;
      case EntityType.guardian: return createGuardianConfig() as any;
      case EntityType.guardianGemQuake: return createGuardianGemQuakeConfig() as any;
      case EntityType.guardianGemFragmentProjectile: return createGuardianGemFragmentProjectileConfig() as any;
      case EntityType.guardianSpikyBall: return createGuardianSpikyBallConfig() as any;
   }
}