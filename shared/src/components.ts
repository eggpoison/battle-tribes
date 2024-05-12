import { StatusEffectData } from "./client-server-types";
import { CactusBodyFlowerData, CactusLimbData, CowSpecies, DeathInfo, DoorToggleType, FishColour, FrozenYetiAttackType, GenericArrowType, EntityType, RockSpikeProjectileSize, SlimeSize, SnowballSize, TreeSize, LimbAction, TribeTotemBanner } from "./entities";
import { BallistaAmmoType, Inventory, InventoryName, ItemType } from "./items";
import { Settings } from "./settings";
import { StatusEffect } from "./status-effects";
import { TitleGenerationInfo } from "./titles";

/*
data sent:
- Array of components (corresponding to the array of component types)

in server:
- 
*/

export enum ServerComponentType {
   aiHelper,
   arrow,
   berryBush,
   blueprint,
   boulder,
   cactus,
   cooking,
   cow,
   door,
   fish,
   frozenYeti,
   golem,
   health,
   hut,
   iceShard,
   iceSpikes,
   inventory,
   inventoryUse,
   item,
   pebblum,
   physics,
   player,
   rockSpike,
   slime,
   slimeSpit,
   slimewisp,
   snowball,
   statusEffect,
   throwingProjectile,
   tombstone,
   totemBanner,
   tree,
   tribe,
   tribeMember,
   tribesman,
   turret,
   yeti,
   zombie,
   ammoBox,
   wanderAI,
   escapeAI,
   followAI,
   researchBench,
   tunnel,
   buildingMaterial,
   spikes,
   tribeWarrior,
   healingTotem,
   planterBox,
   plant,
   fenceConnection,
   fence,
   fenceGate
}

export const EntityComponents = {
   [EntityType.cow]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.wanderAI, ServerComponentType.escapeAI, ServerComponentType.followAI, ServerComponentType.cow] as const,
   [EntityType.zombie]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.zombie, ServerComponentType.wanderAI, ServerComponentType.aiHelper, ServerComponentType.inventory, ServerComponentType.inventoryUse] as const,
   [EntityType.tombstone]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tombstone] as const,
   [EntityType.tree]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tree] as const,
   [EntityType.workbench]: [ServerComponentType.health, ServerComponentType.statusEffect] as const,
   [EntityType.boulder]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.boulder] as const,
   [EntityType.berryBush]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.berryBush] as const,
   [EntityType.cactus]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.cactus] as const,
   [EntityType.yeti]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.aiHelper, ServerComponentType.yeti] as const,
   [EntityType.iceSpikes]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.iceSpikes] as const,
   [EntityType.slime]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.slime, ServerComponentType.wanderAI, ServerComponentType.aiHelper] as const,
   [EntityType.slimewisp]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.slimewisp, ServerComponentType.wanderAI, ServerComponentType.aiHelper] as const,
   [EntityType.player]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.player] as const,
   [EntityType.tribeWorker]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribesman] as const,
   [EntityType.tribeWarrior]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribesman, ServerComponentType.tribeWarrior] as const,
   [EntityType.tribeTotem]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.totemBanner] as const,
   [EntityType.workerHut]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.hut] as const,
   [EntityType.warriorHut]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.hut] as const,
   [EntityType.barrel]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.inventory] as const,
   [EntityType.campfire]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.inventory, ServerComponentType.cooking] as const,
   [EntityType.furnace]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.inventory, ServerComponentType.cooking] as const,
   [EntityType.snowball]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.snowball] as const,
   [EntityType.krumblid]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.followAI, ServerComponentType.escapeAI, ServerComponentType.aiHelper] as const,
   [EntityType.frozenYeti]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.frozenYeti, ServerComponentType.aiHelper] as const,
   [EntityType.fish]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.escapeAI, ServerComponentType.aiHelper, ServerComponentType.fish] as const,
   [EntityType.itemEntity]: [ServerComponentType.physics, ServerComponentType.item] as const,
   [EntityType.woodenArrowProjectile]: [ServerComponentType.physics, ServerComponentType.tribe, ServerComponentType.arrow] as const,
   [EntityType.iceShardProjectile]: [ServerComponentType.physics, ServerComponentType.iceShard] as const,
   [EntityType.rockSpikeProjectile]: [ServerComponentType.rockSpike] as const,
   [EntityType.spearProjectile]: [ServerComponentType.physics, ServerComponentType.throwingProjectile] as const,
   [EntityType.researchBench]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.researchBench] as const,
   [EntityType.wall]: [ServerComponentType.health, ServerComponentType.tribe, ServerComponentType.buildingMaterial] as const,
   [EntityType.slimeSpit]: [ServerComponentType.physics, ServerComponentType.slimeSpit] as const,
   [EntityType.spitPoison]: [] as const,
   [EntityType.door]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.door, ServerComponentType.tribe, ServerComponentType.buildingMaterial] as const,
   [EntityType.battleaxeProjectile]: [ServerComponentType.physics, ServerComponentType.throwingProjectile] as const,
   [EntityType.golem]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.golem] as const,
   [EntityType.planterBox]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.planterBox] as const,
   [EntityType.iceArrow]: [ServerComponentType.physics, ServerComponentType.tribe] as const,
   [EntityType.pebblum]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.pebblum] as const,
   [EntityType.embrasure]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.buildingMaterial] as const,
   [EntityType.floorSpikes]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.buildingMaterial] as const,
   [EntityType.wallSpikes]:  [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.buildingMaterial] as const,
   [EntityType.floorPunjiSticks]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes] as const,
   [EntityType.wallPunjiSticks]:  [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes] as const,
   [EntityType.blueprintEntity]: [ServerComponentType.health, ServerComponentType.blueprint, ServerComponentType.tribe] as const,
   [EntityType.ballista]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper, ServerComponentType.ammoBox, ServerComponentType.inventory] as const,
   [EntityType.slingTurret]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper] as const,
   [EntityType.tunnel]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tunnel, ServerComponentType.buildingMaterial] as const,
   [EntityType.healingTotem]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.healingTotem] as const,
   [EntityType.plant]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.plant] as const,
   [EntityType.fence]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.fenceConnection, ServerComponentType.fence] as const,
   [EntityType.fenceGate]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.fenceConnection, ServerComponentType.fenceGate] as const
} satisfies Record<EntityType, ReadonlyArray<ServerComponentType>>;

export type EntityComponentTypes<T extends EntityType> = typeof EntityComponents[T];

const _ComponentData = {
   [ServerComponentType.aiHelper]: (): AIHelperComponentData => 0 as any,
   [ServerComponentType.arrow]: (): ArrowComponentData => 0 as any,
   [ServerComponentType.ammoBox]: (): AmmoBoxComponentData => 0 as any,
   [ServerComponentType.berryBush]: (): BerryBushComponentData => 0 as any,
   [ServerComponentType.blueprint]: (): BlueprintComponentData => 0 as any,
   [ServerComponentType.boulder]: (): BoulderComponentData => 0 as any,
   [ServerComponentType.cactus]: (): CactusComponentData => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponentData => 0 as any,
   [ServerComponentType.cow]: (): CowComponentData => 0 as any,
   [ServerComponentType.door]: (): DoorComponentData => 0 as any,
   [ServerComponentType.fish]: (): FishComponentData => 0 as any,
   [ServerComponentType.frozenYeti]: (): FrozenYetiComponentData => 0 as any,
   [ServerComponentType.golem]: (): GolemComponentData => 0 as any,
   [ServerComponentType.health]: (): HealthComponentData => 0 as any,
   [ServerComponentType.hut]: (): HutComponentData => 0 as any,
   [ServerComponentType.iceShard]: (): IceShardComponentData => 0 as any,
   [ServerComponentType.iceSpikes]: (): IceSpikesComponentData => 0 as any,
   [ServerComponentType.inventory]: (): InventoryComponentData => 0 as any,
   [ServerComponentType.inventoryUse]: (): InventoryUseComponentData => 0 as any,
   [ServerComponentType.item]: (): ItemComponentData => 0 as any,
   [ServerComponentType.pebblum]: (): PebblumComponentData => 0 as any,
   [ServerComponentType.physics]: (): PhysicsComponentData => 0 as any,
   [ServerComponentType.player]: (): PlayerComponentData => 0 as any,
   [ServerComponentType.rockSpike]: (): RockSpikeProjectileComponentData => 0 as any,
   [ServerComponentType.slime]: (): SlimeComponentData => 0 as any,
   [ServerComponentType.slimeSpit]: (): SlimeSpitComponentData => 0 as any,
   [ServerComponentType.slimewisp]: (): SlimewispComponentData => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponentData => 0 as any,
   [ServerComponentType.statusEffect]: (): StatusEffectComponentData => 0 as any,
   [ServerComponentType.throwingProjectile]: (): ThrowingProjectileComponentData => 0 as any,
   [ServerComponentType.tombstone]: (): TombstoneComponentData => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponentData => 0 as any,
   [ServerComponentType.tree]: (): TreeComponentData => 0 as any,
   [ServerComponentType.tribe]: (): TribeComponentData => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponentData => 0 as any,
   [ServerComponentType.tribesman]: (): TribesmanComponentData => 0 as any,
   [ServerComponentType.turret]: (): TurretComponentData => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponentData => 0 as any,
   [ServerComponentType.zombie]: (): ZombieComponentData => 0 as any,
   [ServerComponentType.wanderAI]: (): WanderAIComponentData => 0 as any,
   [ServerComponentType.escapeAI]: (): EscapeAIComponentData => 0 as any,
   [ServerComponentType.followAI]: (): FollowAIComponentData => 0 as any,
   [ServerComponentType.researchBench]: (): ResearchBenchComponentData => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponentData => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponentData => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponentData => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponentData => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponentData => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponentData => 0 as any,
   [ServerComponentType.plant]: (): PlantComponentData => 0 as any,
   [ServerComponentType.fenceConnection]: (): FenceConnectionComponentData => 0 as any,
   [ServerComponentType.fence]: (): FenceComponentData => 0 as any,
   [ServerComponentType.fenceGate]: (): FenceGateComponentData => 0 as any
} satisfies Record<ServerComponentType, () => unknown>;

export type ComponentData<T extends ServerComponentType = ServerComponentType> = ReturnType<typeof _ComponentData[T]>;

// @Cleanup: Name
// wizardry
type A<Tuple extends Readonly<[...ServerComponentType[]]>> = {
   [Index in keyof Tuple]: ComponentData<Tuple[Index]>;
}
export type EntityComponentsData<T extends EntityType> = A<EntityComponentTypes<T>>;

/* AI Helper Component */
export interface AIHelperComponentData {
   readonly visionRange: number;
}

/* Arrow Component */

export interface ArrowStatusEffectInfo {
   readonly type: StatusEffect;
   readonly durationTicks: number;
}

export interface ArrowComponentData {
   readonly arrowType: GenericArrowType;
}

/* Berry Bush Component */

export interface BerryBushComponentData {
   readonly numBerries: number;
}

/* Blueprint Component */

export enum BlueprintType {
   stoneWall,
   woodenDoor,
   stoneDoor,
   stoneDoorUpgrade,
   woodenEmbrasure,
   stoneEmbrasure,
   stoneEmbrasureUpgrade,
   woodenTunnel,
   stoneTunnel,
   stoneTunnelUpgrade,
   ballista,
   slingTurret,
   stoneFloorSpikes,
   stoneWallSpikes,
   warriorHutUpgrade,
   fenceGate
}

export interface BlueprintComponentData {
   readonly blueprintType: BlueprintType;
   readonly buildProgress: number;
   readonly associatedEntityID: number;
}

/* Boulder Component */

export interface BoulderComponentData {
   readonly boulderType: number;
}

/* Cactus Component */

export interface CactusComponentData {
   readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
   readonly limbs: ReadonlyArray<CactusLimbData>;
}

/* Cooking Component */

export interface CookingComponentData {
   readonly heatingProgress: number;
   readonly isCooking: boolean;
}

/* Cow Component */

export interface CowComponentData {
   readonly species: CowSpecies;
   readonly grazeProgress: number;
}

/* Door Component */

export interface DoorComponentData {
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

/* Fish Component */

export interface FishComponentData {
   readonly colour: FishColour;
}

/* Frozen Yeti Component */

export interface FrozenYetiComponentData {
   readonly attackType: FrozenYetiAttackType;
   readonly attackStage: number;
   readonly stageProgress: number;
   readonly rockSpikePositions: Array<[number, number]>;
}

/* Golem Component */

export interface GolemComponentData {
   readonly wakeProgress: number;
}

/* Health Component */

export interface HealthComponentData {
   readonly health: number;
   readonly maxHealth: number;
}

/* Hut Component */

export interface HutComponentData {
   readonly lastDoorSwingTicks: number;
   readonly isRecalling: boolean;
}

/* Ice Shard Component */

export interface IceShardComponentData {}

/* Ice Spikes Component */

export interface IceSpikesComponentData {}

/* Inventory Component */

export interface InventoryComponentData {
   readonly inventories: Partial<Record<InventoryName, Inventory>>;
}

/* Inventory Use Component */

// @Cleanup: Merge with server definition
export interface LimbData {
   selectedItemSlot: number;
   readonly inventoryName: InventoryName;
   bowCooldownTicks: number;
   itemAttackCooldowns: Partial<Record<number, number>>;
   spearWindupCooldowns: Partial<Record<number, number>>;
   crossbowLoadProgressRecord: Partial<Record<number, number>>;
   foodEatingTimer: number;
   action: LimbAction;
   lastAttackTicks: number;
   lastEatTicks: number;
   // @Cleanup: May be able to merge all 3 of these into 1
   lastBowChargeTicks: number;
   lastSpearChargeTicks: number;
   lastBattleaxeChargeTicks: number;
   lastCrossbowLoadTicks: number;
   lastCraftTicks: number;
   thrownBattleaxeItemID: number;
   lastAttackCooldown: number;
}

export interface InventoryUseComponentData {
   readonly inventoryUseInfos: Array<LimbData>;
}

/* Item Component */

export interface ItemComponentData {
   readonly itemType: ItemType;
}

/* Pebblum Component */

export interface PebblumComponentData {}

/* Physics Component */

export interface PhysicsComponentData {}

/* Player Component */

export interface PlayerComponentData {
   readonly username: string;
}

/* Rock Spike Component */

export interface RockSpikeProjectileComponentData {
   readonly size: RockSpikeProjectileSize;
   readonly lifetime: number;
}

/* Slime Component */

export interface SlimeComponentData {
   readonly size: SlimeSize;
   readonly eyeRotation: number;
   readonly orbSizes: ReadonlyArray<SlimeSize>;
   readonly anger: number;
   readonly spitChargeProgress: number;
}

/* Slime Spit Component */

export interface SlimeSpitComponentData {
   readonly size: number;
}

/* Slimewisp Component */

export interface SlimewispComponentData {}

/* Snowball Component */

export interface SnowballComponentData {
   readonly size: SnowballSize;
}

/* Status Effect Component */

export interface StatusEffectComponentData {
   readonly statusEffects: Array<StatusEffectData>;
}

/* Throwing Projectile Component */

export interface ThrowingProjectileComponentData {}

/* Tombstone Component */

export interface TombstoneComponentData {
   readonly tombstoneType: number;
   readonly zombieSpawnProgress: number;
   readonly zombieSpawnX: number;
   readonly zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

/* Totem Banner Component */

export interface TotemBannerComponentData {
   readonly banners: Array<TribeTotemBanner>;
}

/* Tree Component */

export interface TreeComponentData {
   readonly treeSize: TreeSize;
}

/* Tribe Component */

export interface TribeComponentData {
   readonly tribeID: number;
}

/* Tribe Member Component */

export interface TribeMemberComponentData {
   readonly warPaintType: number;
   readonly titles: ReadonlyArray<TitleGenerationInfo>;
}

/* Tribesman Component */

export enum TribesmanAIType {
   escaping,
   attacking,
   harvestingResources,
   pickingUpDroppedItems,
   haulingResources,
   grabbingFood,
   patrolling,
   eating,
   repairing,
   assistingOtherTribesmen,
   building,
   crafting,
   researching,
   giftingItems,
   idle,
   recruiting
}

export interface TribesmanComponentData {
   readonly name: number;
   readonly untitledDescriptor: number;
   readonly aiType: TribesmanAIType;
   readonly relationsWithPlayer: number;

   readonly craftingProgress: number;
   readonly craftingItemType: ItemType;
}

/* Turret Component */

export interface TurretComponentData {
   readonly aimDirection: number;
   readonly chargeProgress: number;
   readonly reloadProgress: number;
}

/* Yeti Component */

export interface YetiComponentData {
   readonly attackProgress: number;
}

/* Zombie Component */

export interface ZombieComponentData {
   readonly zombieType: number;
}

/* Ballista Component */

export interface AmmoBoxComponentData {
   readonly ammoType: BallistaAmmoType;
   readonly ammoRemaining: number;
}

/* Wander AI Component */

export interface WanderAIComponentData {
   readonly targetPositionX: number;
   readonly targetPositionY: number;
}

/* Escape AI Component */

export interface EscapeAIComponentData {
   /** IDs of all entities attacking the entity */
   readonly attackingEntityIDs: Array<number>;
   readonly attackEntityTicksSinceLastAttack: Array<number>;
}

/* Follow AI Component */

export interface FollowAIComponentData {
   /** ID of the followed entity */
   readonly followTargetID: number;
   readonly followCooldownTicks: number;
   /** Keeps track of how long the mob has been interested in its target */
   readonly interestTimer: number;
}

/* Research Bench Component */

export interface ResearchBenchComponentData {
   readonly isOccupied: boolean;
}

/* Spikes Component */

export interface SpikesComponentData {
   readonly isCovered: boolean;
   readonly attachedWallID: number;
}

/* Tunnel Component */

export interface TunnelComponentData {
   /** 1st bit = door at top, 2nd bit = door at bottom */
   readonly doorBitset: number;
   readonly topDoorOpenProgress: number;
   readonly bottomDoorOpenProgress: number;
}

/* Building Material Component Data */

export enum BuildingMaterial {
   wood,
   stone
}

export interface BuildingMaterialComponentData {
   readonly material: BuildingMaterial;
}

export const MATERIAL_TO_ITEM_MAP: Record<BuildingMaterial, ItemType> = {
   [BuildingMaterial.wood]: ItemType.wood,
   [BuildingMaterial.stone]: ItemType.rock
};

/* Tribe Warrior Component Data */

export interface ScarInfo {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
   readonly type: number;
}

export interface TribeWarriorComponentData {
   readonly scars: ReadonlyArray<ScarInfo>;
}

/* Healing Totem Component Data */

export interface HealingTotemTargetData {
   readonly entityID: number;
   readonly x: number;
   readonly y: number;
   readonly ticksHealed: number;
}

export interface HealingTotemComponentData {
   readonly healingTargetsData: ReadonlyArray<HealingTotemTargetData>;
}

/* Plant Component Data */

export enum PlanterBoxPlant {
   tree,
   berryBush,
   iceSpikes
}

export interface PlantComponentData {
   readonly plant: PlanterBoxPlant;
   readonly plantGrowthProgress: number;
   readonly numFruit: number;
}

/* Planter Box Component Data */

export interface PlanterBoxComponentData {
   readonly plantType: PlanterBoxPlant | null;
}

/* Fence Connection Component Data */

export interface FenceConnectionComponentData {
   readonly connectedSidesBitset: number;
}

/* Fence Component Data */

export interface FenceComponentData {}

/* Fence Gate Component Data */

export interface FenceGateComponentData {
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

// @Cleanup: Should these be here?

export interface GenericAmmoInfo {
   readonly type: GenericArrowType;
   readonly damage: number;
   readonly knockback: number;
   readonly shotCooldownTicks: number;
   readonly reloadTimeTicks: number;
   readonly projectileSpeed: number;
   readonly hitboxWidth: number;
   readonly hitboxHeight: number;
   readonly ammoMultiplier: number;
   readonly statusEffect: ArrowStatusEffectInfo | null;
}

export const AMMO_INFO_RECORD: Record<BallistaAmmoType, GenericAmmoInfo> = {
   [ItemType.wood]: {
      type: GenericArrowType.woodenBolt,
      damage: 5,
      knockback: 150,
      shotCooldownTicks: 2.5 * Settings.TPS,
      reloadTimeTicks: Math.floor(0.4 * Settings.TPS),
      projectileSpeed: 1100,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 3,
      statusEffect: null
   },
   [ItemType.rock]: {
      type: GenericArrowType.ballistaRock,
      damage: 8,
      knockback: 350,
      shotCooldownTicks: 3 * Settings.TPS,
      reloadTimeTicks: Math.floor(0.5 * Settings.TPS),
      projectileSpeed: 1000,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 3,
      statusEffect: null
   },
   [ItemType.slimeball]: {
      type: GenericArrowType.ballistaSlimeball,
      damage: 3,
      knockback: 0,
      shotCooldownTicks: 2 * Settings.TPS,
      reloadTimeTicks: Math.floor(0.4 * Settings.TPS),
      projectileSpeed: 800,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 4,
      statusEffect: {
         type: StatusEffect.poisoned,
         durationTicks: 2.5 * Settings.TPS
      }
   },
   [ItemType.frostcicle]: {
      type: GenericArrowType.ballistaFrostcicle,
      damage: 1,
      knockback: 50,
      shotCooldownTicks: 0.5 * Settings.TPS,
      reloadTimeTicks: Math.floor(0.15 * Settings.TPS),
      projectileSpeed: 1500,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 6,
      statusEffect: {
         type: StatusEffect.freezing,
         durationTicks: 1 * Settings.TPS
      }
   }
}