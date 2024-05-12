export type EntityBehaviour = "passive" | "neutral" | "hostile";
export declare const enum EntityType {
    cow = 0,
    zombie = 1,
    tombstone = 2,
    tree = 3,
    workbench = 4,
    boulder = 5,
    berryBush = 6,
    cactus = 7,
    yeti = 8,
    iceSpikes = 9,
    slime = 10,
    slimewisp = 11,
    player = 12,
    tribeWorker = 13,
    tribeWarrior = 14,
    tribeTotem = 15,
    workerHut = 16,
    warriorHut = 17,
    barrel = 18,
    campfire = 19,
    furnace = 20,
    snowball = 21,
    krumblid = 22,
    frozenYeti = 23,
    fish = 24,
    itemEntity = 25,
    woodenArrowProjectile = 26,
    iceShardProjectile = 27,
    rockSpikeProjectile = 28,
    spearProjectile = 29,
    researchBench = 30,
    wall = 31,
    slimeSpit = 32,
    spitPoison = 33,
    door = 34,
    battleaxeProjectile = 35,
    golem = 36,
    planterBox = 37,
    iceArrow = 38,
    pebblum = 39,
    embrasure = 40,
    tunnel = 41,
    floorSpikes = 42,
    wallSpikes = 43,
    floorPunjiSticks = 44,
    wallPunjiSticks = 45,
    blueprintEntity = 46,
    ballista = 47,
    slingTurret = 48,
    healingTotem = 49,
    plant = 50,
    fence = 51,
    fenceGate = 52
}
export declare const EntityTypeString: Record<EntityType, string>;
export declare const RESOURCE_ENTITY_TYPES: ReadonlyArray<EntityType>;
export declare const MOB_ENTITY_TYPES: ReadonlyArray<EntityType>;
export declare enum CowSpecies {
    brown = 0,
    black = 1
}
export declare enum TreeSize {
    small = 0,
    large = 1
}
export declare enum CactusFlowerSize {
    small = 0,
    large = 1
}
export interface CactusFlowerData {
    readonly type: number;
    readonly height: number;
    readonly rotation: number;
}
export interface CactusBodyFlowerData extends CactusFlowerData {
    readonly size: CactusFlowerSize;
    readonly column: number;
}
export interface CactusLimbFlowerData extends CactusFlowerData {
    readonly direction: number;
}
export interface CactusLimbData {
    readonly direction: number;
    readonly flower?: CactusLimbFlowerData;
}
export declare enum SlimeSize {
    small = 0,
    medium = 1,
    large = 2
}
export interface TribeTotemBanner {
    readonly hutNum: number;
    /** The ring layer in the totem which the banner is on */
    readonly layer: number;
    readonly direction: number;
}
export declare enum SnowballSize {
    small = 0,
    large = 1
}
export declare const SNOWBALL_SIZES: Record<SnowballSize, number>;
export declare enum PlayerCauseOfDeath {
    yeti = 0,
    zombie = 1,
    poison = 2,
    fire = 3,
    tribe_member = 4,
    arrow = 5,
    ice_spikes = 6,
    ice_shards = 7,
    cactus = 8,
    snowball = 9,
    slime = 10,
    god = 11,
    frozen_yeti = 12,
    bloodloss = 13,
    rock_spike = 14,
    lack_of_oxygen = 15,
    fish = 16,
    spear = 17
}
export interface DeathInfo {
    readonly username: string;
    readonly causeOfDeath: PlayerCauseOfDeath;
}
export declare enum LimbAction {
    chargeBow = 0,
    chargeSpear = 1,
    chargeBattleaxe = 2,
    loadCrossbow = 3,
    researching = 4,
    useMedicine = 5,
    eat = 6,
    craft = 7,
    none = 8
}
export declare enum FrozenYetiAttackType {
    snowThrow = 0,
    roar = 1,
    stomp = 2,
    bite = 3,
    none = 4
}
export declare enum FishColour {
    blue = 0,
    gold = 1,
    red = 2,
    lime = 3
}
export declare enum RockSpikeProjectileSize {
    small = 0,
    medium = 1,
    large = 2
}
export declare enum DoorToggleType {
    none = 0,
    close = 1,
    open = 2
}
export declare enum GenericArrowType {
    woodenArrow = 0,
    woodenBolt = 1,
    ballistaRock = 2,
    ballistaSlimeball = 3,
    ballistaFrostcicle = 4,
    slingRock = 5
}
