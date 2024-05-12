import { StatusEffectData } from "./client-server-types";
import { CactusBodyFlowerData, CactusLimbData, CowSpecies, DeathInfo, DoorToggleType, FishColour, FrozenYetiAttackType, GenericArrowType, EntityType, RockSpikeProjectileSize, SlimeSize, SnowballSize, TreeSize, LimbAction, TribeTotemBanner } from "./entities";
import { BallistaAmmoType, Inventory, InventoryName, ItemType } from "./items";
import { StatusEffect } from "./status-effects";
import { TitleGenerationInfo } from "./titles";
export declare enum ServerComponentType {
    aiHelper = 0,
    arrow = 1,
    berryBush = 2,
    blueprint = 3,
    boulder = 4,
    cactus = 5,
    cooking = 6,
    cow = 7,
    door = 8,
    fish = 9,
    frozenYeti = 10,
    golem = 11,
    health = 12,
    hut = 13,
    iceShard = 14,
    iceSpikes = 15,
    inventory = 16,
    inventoryUse = 17,
    item = 18,
    pebblum = 19,
    physics = 20,
    player = 21,
    rockSpike = 22,
    slime = 23,
    slimeSpit = 24,
    slimewisp = 25,
    snowball = 26,
    statusEffect = 27,
    throwingProjectile = 28,
    tombstone = 29,
    totemBanner = 30,
    tree = 31,
    tribe = 32,
    tribeMember = 33,
    tribesman = 34,
    turret = 35,
    yeti = 36,
    zombie = 37,
    ammoBox = 38,
    wanderAI = 39,
    escapeAI = 40,
    followAI = 41,
    researchBench = 42,
    tunnel = 43,
    buildingMaterial = 44,
    spikes = 45,
    tribeWarrior = 46,
    healingTotem = 47,
    planterBox = 48,
    plant = 49,
    fenceConnection = 50,
    fence = 51,
    fenceGate = 52
}
export declare const EntityComponents: {
    0: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.wanderAI, ServerComponentType.escapeAI, ServerComponentType.followAI, ServerComponentType.cow];
    1: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.zombie, ServerComponentType.wanderAI, ServerComponentType.aiHelper, ServerComponentType.inventory, ServerComponentType.inventoryUse];
    2: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tombstone];
    3: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tree];
    4: readonly [ServerComponentType.health, ServerComponentType.statusEffect];
    5: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.boulder];
    6: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.berryBush];
    7: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.cactus];
    8: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.aiHelper, ServerComponentType.yeti];
    9: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.iceSpikes];
    10: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.slime, ServerComponentType.wanderAI, ServerComponentType.aiHelper];
    11: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.slimewisp, ServerComponentType.wanderAI, ServerComponentType.aiHelper];
    12: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.player];
    13: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribesman];
    14: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribesman, ServerComponentType.tribeWarrior];
    15: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.totemBanner];
    16: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.hut];
    17: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.hut];
    18: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.inventory];
    19: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.inventory, ServerComponentType.cooking];
    20: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.inventory, ServerComponentType.cooking];
    21: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.snowball];
    22: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.followAI, ServerComponentType.escapeAI, ServerComponentType.aiHelper];
    23: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.frozenYeti, ServerComponentType.aiHelper];
    24: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.escapeAI, ServerComponentType.aiHelper, ServerComponentType.fish];
    25: readonly [ServerComponentType.physics, ServerComponentType.item];
    26: readonly [ServerComponentType.physics, ServerComponentType.tribe, ServerComponentType.arrow];
    27: readonly [ServerComponentType.physics, ServerComponentType.iceShard];
    28: readonly [ServerComponentType.rockSpike];
    29: readonly [ServerComponentType.physics, ServerComponentType.throwingProjectile];
    30: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.researchBench];
    31: readonly [ServerComponentType.health, ServerComponentType.tribe, ServerComponentType.buildingMaterial];
    32: readonly [ServerComponentType.physics, ServerComponentType.slimeSpit];
    33: readonly [];
    34: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.door, ServerComponentType.tribe, ServerComponentType.buildingMaterial];
    35: readonly [ServerComponentType.physics, ServerComponentType.throwingProjectile];
    36: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.golem];
    37: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.planterBox];
    38: readonly [ServerComponentType.physics, ServerComponentType.tribe];
    39: readonly [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.pebblum];
    40: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.buildingMaterial];
    42: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.buildingMaterial];
    43: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.buildingMaterial];
    44: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes];
    45: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes];
    46: readonly [ServerComponentType.health, ServerComponentType.blueprint, ServerComponentType.tribe];
    47: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper, ServerComponentType.ammoBox, ServerComponentType.inventory];
    48: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper];
    41: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tunnel, ServerComponentType.buildingMaterial];
    49: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.healingTotem];
    50: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.plant];
    51: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.fenceConnection, ServerComponentType.fence];
    52: readonly [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.fenceConnection, ServerComponentType.fenceGate];
};
export type EntityComponentTypes<T extends EntityType> = typeof EntityComponents[T];
declare const _ComponentData: {
    0: () => AIHelperComponentData;
    1: () => ArrowComponentData;
    38: () => AmmoBoxComponentData;
    2: () => BerryBushComponentData;
    3: () => BlueprintComponentData;
    4: () => BoulderComponentData;
    5: () => CactusComponentData;
    6: () => CookingComponentData;
    7: () => CowComponentData;
    8: () => DoorComponentData;
    9: () => FishComponentData;
    10: () => FrozenYetiComponentData;
    11: () => GolemComponentData;
    12: () => HealthComponentData;
    13: () => HutComponentData;
    14: () => IceShardComponentData;
    15: () => IceSpikesComponentData;
    16: () => InventoryComponentData;
    17: () => InventoryUseComponentData;
    18: () => ItemComponentData;
    19: () => PebblumComponentData;
    20: () => PhysicsComponentData;
    21: () => PlayerComponentData;
    22: () => RockSpikeProjectileComponentData;
    23: () => SlimeComponentData;
    24: () => SlimeSpitComponentData;
    25: () => SlimewispComponentData;
    26: () => SnowballComponentData;
    27: () => StatusEffectComponentData;
    28: () => ThrowingProjectileComponentData;
    29: () => TombstoneComponentData;
    30: () => TotemBannerComponentData;
    31: () => TreeComponentData;
    32: () => TribeComponentData;
    33: () => TribeMemberComponentData;
    34: () => TribesmanComponentData;
    35: () => TurretComponentData;
    36: () => YetiComponentData;
    37: () => ZombieComponentData;
    39: () => WanderAIComponentData;
    40: () => EscapeAIComponentData;
    41: () => FollowAIComponentData;
    42: () => ResearchBenchComponentData;
    43: () => TunnelComponentData;
    44: () => BuildingMaterialComponentData;
    45: () => SpikesComponentData;
    46: () => TribeWarriorComponentData;
    47: () => HealingTotemComponentData;
    48: () => PlanterBoxComponentData;
    49: () => PlantComponentData;
    50: () => FenceConnectionComponentData;
    51: () => FenceComponentData;
    52: () => FenceGateComponentData;
};
export type ComponentData<T extends ServerComponentType = ServerComponentType> = ReturnType<typeof _ComponentData[T]>;
type A<Tuple extends Readonly<[...ServerComponentType[]]>> = {
    [Index in keyof Tuple]: ComponentData<Tuple[Index]>;
};
export type EntityComponentsData<T extends EntityType> = A<EntityComponentTypes<T>>;
export interface AIHelperComponentData {
    readonly visionRange: number;
}
export interface ArrowStatusEffectInfo {
    readonly type: StatusEffect;
    readonly durationTicks: number;
}
export interface ArrowComponentData {
    readonly arrowType: GenericArrowType;
}
export interface BerryBushComponentData {
    readonly numBerries: number;
}
export declare enum BlueprintType {
    stoneWall = 0,
    woodenDoor = 1,
    stoneDoor = 2,
    stoneDoorUpgrade = 3,
    woodenEmbrasure = 4,
    stoneEmbrasure = 5,
    stoneEmbrasureUpgrade = 6,
    woodenTunnel = 7,
    stoneTunnel = 8,
    stoneTunnelUpgrade = 9,
    ballista = 10,
    slingTurret = 11,
    stoneFloorSpikes = 12,
    stoneWallSpikes = 13,
    warriorHutUpgrade = 14,
    fenceGate = 15
}
export interface BlueprintComponentData {
    readonly blueprintType: BlueprintType;
    readonly buildProgress: number;
    readonly associatedEntityID: number;
}
export interface BoulderComponentData {
    readonly boulderType: number;
}
export interface CactusComponentData {
    readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
    readonly limbs: ReadonlyArray<CactusLimbData>;
}
export interface CookingComponentData {
    readonly heatingProgress: number;
    readonly isCooking: boolean;
}
export interface CowComponentData {
    readonly species: CowSpecies;
    readonly grazeProgress: number;
}
export interface DoorComponentData {
    readonly toggleType: DoorToggleType;
    readonly openProgress: number;
}
export interface FishComponentData {
    readonly colour: FishColour;
}
export interface FrozenYetiComponentData {
    readonly attackType: FrozenYetiAttackType;
    readonly attackStage: number;
    readonly stageProgress: number;
    readonly rockSpikePositions: Array<[number, number]>;
}
export interface GolemComponentData {
    readonly wakeProgress: number;
}
export interface HealthComponentData {
    readonly health: number;
    readonly maxHealth: number;
}
export interface HutComponentData {
    readonly lastDoorSwingTicks: number;
    readonly isRecalling: boolean;
}
export interface IceShardComponentData {
}
export interface IceSpikesComponentData {
}
export interface InventoryComponentData {
    readonly inventories: Partial<Record<InventoryName, Inventory>>;
}
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
export interface ItemComponentData {
    readonly itemType: ItemType;
}
export interface PebblumComponentData {
}
export interface PhysicsComponentData {
}
export interface PlayerComponentData {
    readonly username: string;
}
export interface RockSpikeProjectileComponentData {
    readonly size: RockSpikeProjectileSize;
    readonly lifetime: number;
}
export interface SlimeComponentData {
    readonly size: SlimeSize;
    readonly eyeRotation: number;
    readonly orbSizes: ReadonlyArray<SlimeSize>;
    readonly anger: number;
    readonly spitChargeProgress: number;
}
export interface SlimeSpitComponentData {
    readonly size: number;
}
export interface SlimewispComponentData {
}
export interface SnowballComponentData {
    readonly size: SnowballSize;
}
export interface StatusEffectComponentData {
    readonly statusEffects: Array<StatusEffectData>;
}
export interface ThrowingProjectileComponentData {
}
export interface TombstoneComponentData {
    readonly tombstoneType: number;
    readonly zombieSpawnProgress: number;
    readonly zombieSpawnX: number;
    readonly zombieSpawnY: number;
    readonly deathInfo: DeathInfo | null;
}
export interface TotemBannerComponentData {
    readonly banners: Array<TribeTotemBanner>;
}
export interface TreeComponentData {
    readonly treeSize: TreeSize;
}
export interface TribeComponentData {
    readonly tribeID: number;
}
export interface TribeMemberComponentData {
    readonly warPaintType: number;
    readonly titles: ReadonlyArray<TitleGenerationInfo>;
}
export declare enum TribesmanAIType {
    escaping = 0,
    attacking = 1,
    harvestingResources = 2,
    pickingUpDroppedItems = 3,
    haulingResources = 4,
    grabbingFood = 5,
    patrolling = 6,
    eating = 7,
    repairing = 8,
    assistingOtherTribesmen = 9,
    building = 10,
    crafting = 11,
    researching = 12,
    giftingItems = 13,
    idle = 14,
    recruiting = 15
}
export interface TribesmanComponentData {
    readonly name: number;
    readonly untitledDescriptor: number;
    readonly aiType: TribesmanAIType;
    readonly relationsWithPlayer: number;
    readonly craftingProgress: number;
    readonly craftingItemType: ItemType;
}
export interface TurretComponentData {
    readonly aimDirection: number;
    readonly chargeProgress: number;
    readonly reloadProgress: number;
}
export interface YetiComponentData {
    readonly attackProgress: number;
}
export interface ZombieComponentData {
    readonly zombieType: number;
}
export interface AmmoBoxComponentData {
    readonly ammoType: BallistaAmmoType;
    readonly ammoRemaining: number;
}
export interface WanderAIComponentData {
    readonly targetPositionX: number;
    readonly targetPositionY: number;
}
export interface EscapeAIComponentData {
    /** IDs of all entities attacking the entity */
    readonly attackingEntityIDs: Array<number>;
    readonly attackEntityTicksSinceLastAttack: Array<number>;
}
export interface FollowAIComponentData {
    /** ID of the followed entity */
    readonly followTargetID: number;
    readonly followCooldownTicks: number;
    /** Keeps track of how long the mob has been interested in its target */
    readonly interestTimer: number;
}
export interface ResearchBenchComponentData {
    readonly isOccupied: boolean;
}
export interface SpikesComponentData {
    readonly isCovered: boolean;
    readonly attachedWallID: number;
}
export interface TunnelComponentData {
    /** 1st bit = door at top, 2nd bit = door at bottom */
    readonly doorBitset: number;
    readonly topDoorOpenProgress: number;
    readonly bottomDoorOpenProgress: number;
}
export declare enum BuildingMaterial {
    wood = 0,
    stone = 1
}
export interface BuildingMaterialComponentData {
    readonly material: BuildingMaterial;
}
export declare const MATERIAL_TO_ITEM_MAP: Record<BuildingMaterial, ItemType>;
export interface ScarInfo {
    readonly offsetX: number;
    readonly offsetY: number;
    readonly rotation: number;
    readonly type: number;
}
export interface TribeWarriorComponentData {
    readonly scars: ReadonlyArray<ScarInfo>;
}
export interface HealingTotemTargetData {
    readonly entityID: number;
    readonly x: number;
    readonly y: number;
    readonly ticksHealed: number;
}
export interface HealingTotemComponentData {
    readonly healingTargetsData: ReadonlyArray<HealingTotemTargetData>;
}
export declare enum PlanterBoxPlant {
    tree = 0,
    berryBush = 1,
    iceSpikes = 2
}
export interface PlantComponentData {
    readonly plant: PlanterBoxPlant;
    readonly plantGrowthProgress: number;
    readonly numFruit: number;
}
export interface PlanterBoxComponentData {
    readonly plantType: PlanterBoxPlant | null;
}
export interface FenceConnectionComponentData {
    readonly connectedSidesBitset: number;
}
export interface FenceComponentData {
}
export interface FenceGateComponentData {
    readonly toggleType: DoorToggleType;
    readonly openProgress: number;
}
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
export declare const AMMO_INFO_RECORD: Record<BallistaAmmoType, GenericAmmoInfo>;
export {};
