/** Unique identifier for each entity */
export type EntityID = number;

export const enum EntityType {
   cow,
   zombie,
   tombstone,
   tree,
   workbench,
   boulder,
   berryBush,
   cactus,
   yeti,
   iceSpikes,
   slime,
   slimewisp,
   player,
   tribeWorker,
   tribeWarrior,
   tribeTotem,
   workerHut,
   warriorHut,
   barrel,
   campfire,
   furnace,
   snowball,
   krumblid,
   frozenYeti,
   fish,
   itemEntity,
   woodenArrow,
   ballistaWoodenBolt,
   ballistaRock,
   ballistaSlimeball,
   ballistaFrostcicle,
   slingTurretRock,
   iceShardProjectile,
   rockSpikeProjectile,
   spearProjectile,
   researchBench,
   wall,
   slimeSpit,
   spitPoisonArea,
   door,
   battleaxeProjectile,
   golem,
   planterBox,
   iceArrow,
   pebblum,
   embrasure,
   tunnel,
   floorSpikes,
   wallSpikes,
   floorPunjiSticks,
   wallPunjiSticks,
   blueprintEntity,
   ballista,
   slingTurret,
   healingTotem,
   plant,
   fence,
   fenceGate,
   frostshaper,
   stonecarvingTable,
   grassStrand,
   decoration,
   reed,
   lilypad,
   fibrePlant
}

export const EntityTypeString: Record<EntityType, string> = {
   [EntityType.cow]: "cow",
   [EntityType.zombie]: "zombie",
   [EntityType.tombstone]: "tombstone",
   [EntityType.tree]: "tree",
   [EntityType.workbench]: "workbench",
   [EntityType.boulder]: "boulder",
   [EntityType.berryBush]: "berry bush",
   [EntityType.cactus]: "cactus",
   [EntityType.yeti]: "yeti",
   [EntityType.iceSpikes]: "ice spikes",
   [EntityType.slime]: "slime",
   [EntityType.slimewisp]: "slimewisp",
   [EntityType.player]: "player",
   [EntityType.tribeWorker]: "tribe worker",
   [EntityType.tribeWarrior]: "tribe warrior",
   [EntityType.tribeTotem]: "tribe totem",
   [EntityType.workerHut]: "worker hut",
   [EntityType.warriorHut]: "warrior hut",
   [EntityType.barrel]: "barrel",
   [EntityType.campfire]: "campfire",
   [EntityType.furnace]: "furnace",
   [EntityType.snowball]: "snowball",
   [EntityType.krumblid]: "krumblid",
   [EntityType.frozenYeti]: "frozen yeti",
   [EntityType.fish]: "fish",
   [EntityType.itemEntity]: "item entity",
   [EntityType.woodenArrow]: "wooden arrow",
   [EntityType.ballistaWoodenBolt]: "ballista wooden bolt",
   [EntityType.ballistaRock]: "ballista rock",
   [EntityType.ballistaSlimeball]: "ballista slimeball",
   [EntityType.ballistaFrostcicle]: "ballista frostcicle",
   [EntityType.slingTurretRock]: "sling turret rock",
   [EntityType.iceShardProjectile]: "ice shard projectile",
   [EntityType.rockSpikeProjectile]: "rock spike projectile",
   [EntityType.spearProjectile]: "spear projectile",
   [EntityType.researchBench]: "research bench",
   [EntityType.wall]: "wall",
   [EntityType.slimeSpit]: "slime spit",
   [EntityType.spitPoisonArea]: "spit poison",
   [EntityType.door]: "door",
   [EntityType.battleaxeProjectile]: "battleaxe projectile",
   [EntityType.golem]: "golem",
   [EntityType.planterBox]: "planter box",
   [EntityType.iceArrow]: "ice arrow",
   [EntityType.pebblum]: "pebblum",
   [EntityType.embrasure]: "embrasure",
   [EntityType.tunnel]: "tunnel",
   [EntityType.floorSpikes]: "floor spikes",
   [EntityType.wallSpikes]: "wall spikes",
   [EntityType.floorPunjiSticks]: "floor punji sticks",
   [EntityType.wallPunjiSticks]: "wall punji sticks",
   [EntityType.blueprintEntity]: "blueprint entity",
   [EntityType.ballista]: "ballista",
   [EntityType.slingTurret]: "sling turret",
   [EntityType.healingTotem]: "healing totem",
   [EntityType.plant]: "plant",
   [EntityType.fence]: "fence",
   [EntityType.fenceGate]: "fence gate",
   [EntityType.frostshaper]: "frostshaper",
   [EntityType.stonecarvingTable]: "stonecarving table",
   [EntityType.grassStrand]: "grass strand",
   [EntityType.decoration]: "decoration",
   [EntityType.reed]: "reed",
   [EntityType.lilypad]: "lilypad",
   [EntityType.fibrePlant]: "fibre plant"
};

export const NUM_ENTITY_TYPES = Object.keys(EntityTypeString).length;

export function getEntityTypeFromString(entityTypeString: string): EntityType | null {
   for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
      if (EntityTypeString[entityType] === entityTypeString) {
         return entityType;
      }
   }

   return null;
}
   
export const RESOURCE_ENTITY_TYPES: ReadonlyArray<EntityType> = [EntityType.tree, EntityType.berryBush, EntityType.iceSpikes, EntityType.cactus, EntityType.boulder];
export const MOB_ENTITY_TYPES: ReadonlyArray<EntityType> = [EntityType.cow, EntityType.zombie, EntityType.yeti, EntityType.slime, EntityType.slimewisp, EntityType.krumblid, EntityType.frozenYeti];

// @Cleanup: move all of this

export enum CowSpecies {
   brown,
   black
}

export enum TreeSize {
   small,
   large
}

export enum CactusFlowerSize {
   small = 0,
   large = 1
}

export interface CactusFlowerData {
   readonly type: number;
   readonly height: number;
   readonly rotation: number;
}

export interface CactusBodyFlowerData extends CactusFlowerData {
   readonly size: CactusFlowerSize
   readonly column: number;
}

export interface CactusLimbFlowerData extends CactusFlowerData {
   readonly direction: number;
}

export interface CactusLimbData {
   readonly direction: number;
   readonly flower?: CactusLimbFlowerData;
}

export enum SlimeSize {
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

export enum SnowballSize {
   small,
   large
}

export const SNOWBALL_SIZES: Record<SnowballSize, number> = {
   [SnowballSize.small]: 44,
   [SnowballSize.large]: 60
};

// @Cleanup: Rename to something like HitCause
export enum PlayerCauseOfDeath {
   yeti,
   zombie,
   poison,
   fire,
   tribe_member,
   arrow,
   ice_spikes,
   ice_shards,
   cactus,
   snowball,
   slime,
   god,
   frozen_yeti,
   bloodloss,
   rock_spike,
   lack_of_oxygen,
   fish,
   spear
}

export interface DeathInfo {
   readonly username: string;
   readonly causeOfDeath: PlayerCauseOfDeath;
}

export enum LimbAction {
   none,
   chargeBow,
   chargeSpear,
   chargeBattleaxe,
   loadCrossbow,
   researching,
   useMedicine,
   eat,
   craft,
   windAttack,
   attack,
   returnAttackToRest,
   block,
   returnBlockToRest
}

export enum FrozenYetiAttackType {
   snowThrow,
   roar,
   stomp,
   bite,
   none
}

export enum FishColour {
   blue,
   gold,
   red,
   lime
}

export enum RockSpikeProjectileSize {
   small,
   medium,
   large
}

export enum DoorToggleType {
   none,
   close,
   open
}