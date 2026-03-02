/** Unique identifier for each entity */
export type Entity = number;

export enum EntityType {
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
   fish,
   itemEntity,
   fleshSwordItemEntity,
   woodenArrow,
   ballistaWoodenBolt,
   ballistaRock,
   ballistaSlimeball,
   ballistaFrostcicle,
   slingTurretRock,
   iceShardProjectile,
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
   treePlanted,
   berryBushPlanted,
   iceSpikesPlanted,
   fence,
   fenceGate,
   frostshaper,
   stonecarvingTable,
   grassStrand,
   decoration,
   riverSteppingStone,
   reed,
   lilypad,
   fibrePlant,
   guardian,
   guardianGemQuake,
   guardianGemFragmentProjectile,
   guardianSpikyBall,
   bracings,
   fireTorch,
   spikyBastard,
   glurbHeadSegment,
   glurbBodySegment,
   glurbTailSegment,
   slurbTorch,
   treeRootBase,
   treeRootSegment,
   mithrilOreNode,
   scrappy,
   cogwalker,
   automatonAssembler,
   mithrilAnvil,
   heldItem,
   moss,
   floorSign,
   desertBushLively,
   desertBushSandy,
   desertSmallWeed,
   desertShrub,
   tumbleweedLive,
   tumbleweedDead,
   palmTree,
   pricklyPear,
   pricklyPearFragmentProjectile,
   dustflea,
   sandstoneRock,
   okren,
   okrenClaw,
   dustfleaMorphCocoon,
   sandBall,
   krumblidMorphCocoon,
   okrenTongue,
   dustfleaEgg,
   spruceTree,
   tundraRock,
   tundraRockFrozen,
   snowberryBush,
   snobe,
   snobeMound,
   inguSerpent,
   tukmok,
   tukmokTrunk,
   tukmokTailClub,
   tukmokSpur,
   inguYetuksnoglurblidokowflea,
   inguYetuksnoglurblidokowfleaSeekerHead,
   inguYetukLaser
}

export const EntityTypeString: Record<EntityType, string> = {
   [EntityType.cow]: "cow",
   [EntityType.zombie]: "zombie",
   [EntityType.tombstone]: "tombstone",
   [EntityType.tree]: "tree",
   [EntityType.workbench]: "workbench",
   [EntityType.boulder]: "boulder",
   [EntityType.berryBush]: "berryBush",
   [EntityType.cactus]: "cactus",
   [EntityType.yeti]: "yeti",
   [EntityType.iceSpikes]: "iceSpikes",
   [EntityType.slime]: "slime",
   [EntityType.slimewisp]: "slimewisp",
   [EntityType.player]: "player",
   [EntityType.tribeWorker]: "tribeWorker",
   [EntityType.tribeWarrior]: "tribeWarrior",
   [EntityType.tribeTotem]: "tribeTotem",
   [EntityType.workerHut]: "workerHut",
   [EntityType.warriorHut]: "warriorHut",
   [EntityType.barrel]: "barrel",
   [EntityType.campfire]: "campfire",
   [EntityType.furnace]: "furnace",
   [EntityType.snowball]: "snowball",
   [EntityType.krumblid]: "krumblid",
   [EntityType.fish]: "fish",
   [EntityType.itemEntity]: "Item Entity",
   [EntityType.fleshSwordItemEntity]: "Flesh Sword Item Entity",
   [EntityType.woodenArrow]: "woodenArrow",
   [EntityType.ballistaWoodenBolt]: "ballistaWoodenBolt",
   [EntityType.ballistaRock]: "ballistaRock",
   [EntityType.ballistaSlimeball]: "ballistaSlimeball",
   [EntityType.ballistaFrostcicle]: "ballistaFrostcicle",
   [EntityType.slingTurretRock]: "slingTurretRock",
   [EntityType.iceShardProjectile]: "iceShardProjectile",
   [EntityType.spearProjectile]: "spearProjectile",
   [EntityType.researchBench]: "researchBench",
   [EntityType.wall]: "wall",
   [EntityType.slimeSpit]: "slimeSpit",
   [EntityType.spitPoisonArea]: "spitPoisonArea",
   [EntityType.door]: "door",
   [EntityType.battleaxeProjectile]: "battleaxeProjectile",
   [EntityType.golem]: "golem",
   [EntityType.planterBox]: "planterBox",
   [EntityType.iceArrow]: "iceArrow",
   [EntityType.pebblum]: "pebblum",
   [EntityType.embrasure]: "embrasure",
   [EntityType.tunnel]: "tunnel",
   [EntityType.floorSpikes]: "floorSpikes",
   [EntityType.wallSpikes]: "wallSpikes",
   [EntityType.floorPunjiSticks]: "floorPunjiSticks",
   [EntityType.wallPunjiSticks]: "wallPunjiSticks",
   [EntityType.blueprintEntity]: "blueprintEntity",
   [EntityType.ballista]: "ballista",
   [EntityType.slingTurret]: "slingTurret",
   [EntityType.healingTotem]: "healingTotem",
   [EntityType.treePlanted]: "treePlanted",
   [EntityType.berryBushPlanted]: "berryBushPlanted",
   [EntityType.iceSpikesPlanted]: "iceSpikesPlanted",
   [EntityType.fence]: "fence",
   [EntityType.fenceGate]: "fenceGate",
   [EntityType.frostshaper]: "frostshaper",
   [EntityType.stonecarvingTable]: "stonecarvingTable",
   [EntityType.grassStrand]: "grassStrand",
   [EntityType.decoration]: "decoration",
   [EntityType.riverSteppingStone]: "riverSteppingStone",
   [EntityType.reed]: "reed",
   [EntityType.lilypad]: "lilypad",
   [EntityType.fibrePlant]: "fibrePlant",
   [EntityType.guardian]: "guardian",
   [EntityType.guardianGemQuake]: "guardianGemQuake",
   [EntityType.guardianGemFragmentProjectile]: "guardianGemFragmentProjectile",
   [EntityType.guardianSpikyBall]: "guardianSpikyBall",
   [EntityType.bracings]: "bracings",
   [EntityType.fireTorch]: "fireTorch",
   [EntityType.spikyBastard]: "spikyBastard",
   [EntityType.glurbHeadSegment]: "Glurb Head Segment",
   [EntityType.glurbBodySegment]: "Glurb Body Segment",
   [EntityType.glurbTailSegment]: "Glurb Tail Segment",
   [EntityType.slurbTorch]: "slurbTorch",
   [EntityType.treeRootBase]: "treeRootBase",
   [EntityType.treeRootSegment]: "treeRootSegment",
   [EntityType.mithrilOreNode]: "Mithril Ore Node",
   [EntityType.scrappy]: "Scrappy",
   [EntityType.cogwalker]: "Cogwalker",
   [EntityType.automatonAssembler]: "Automaton Assembler",
   [EntityType.mithrilAnvil]: "Mithril Anvil",
   [EntityType.heldItem]: "Held Item",
   [EntityType.moss]: "Moss",
   [EntityType.floorSign]: "Floor Sign",
   [EntityType.desertBushLively]: "Desert Bush Lively",
   [EntityType.desertBushSandy]: "Desert Bush Sandy",
   [EntityType.desertSmallWeed]: "Desert Small Weed",
   [EntityType.desertShrub]: "Desert Shrub",
   [EntityType.tumbleweedLive]: "Tumbleweed Live",
   [EntityType.tumbleweedDead]: "Tumbleweed Dead",
   [EntityType.palmTree]: "Palm Tree",
   [EntityType.pricklyPear]: "Prickly Pear",
   [EntityType.pricklyPearFragmentProjectile]: "Prickly Pear Fragment Projectile",
   [EntityType.dustflea]: "Dustflea",
   [EntityType.sandstoneRock]: "Sandstone Rock",
   [EntityType.okren]: "Okren",
   [EntityType.okrenClaw]: "Okren Claw",
   [EntityType.dustfleaMorphCocoon]: "Dustflea Morph Cocoon",
   [EntityType.sandBall]: "Sand Ball",
   [EntityType.krumblidMorphCocoon]: "Krumblid Morph Cocoon",
   [EntityType.okrenTongue]: "Okren Tongue",
   [EntityType.dustfleaEgg]: "Dustflea Egg",
   [EntityType.spruceTree]: "Spruce Tree",
   [EntityType.tundraRock]: "Tundra Rock",
   [EntityType.tundraRockFrozen]: "Tundra Frozen Rock",
   [EntityType.snowberryBush]: "Snowberry Bush",
   [EntityType.snobe]: "Snobe",
   [EntityType.snobeMound]: "Snobe Mound",
   [EntityType.inguSerpent]: "Ingu Serpent",
   [EntityType.tukmok]: "Tukmok",
   [EntityType.tukmokTrunk]: "Tukmok Trunk",
   [EntityType.tukmokTailClub]: "Tukmok Tail Club",
   [EntityType.tukmokSpur]: "Tukmok Spur",
   [EntityType.inguYetuksnoglurblidokowflea]: "Ingu-Yetuksnoglurblidokowflea",
   [EntityType.inguYetuksnoglurblidokowfleaSeekerHead]: "Ingu-Yetuksnoglurblidokowflea Seeker Head",
   [EntityType.inguYetukLaser]: "Ingu-Yetuk Laser",
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

export enum DamageSource {
   yeti,
   zombie,
   poison,
   fire,
   tribeMember,
   arrow,
   iceSpikes,
   iceShards,
   cactus,
   snowball,
   slime,
   god,
   frozenYeti,
   bloodloss,
   rockSpike,
   lackOfOxygen,
   fish,
   spear
}

export interface DeathInfo {
   readonly username: string;
   readonly damageSource: DamageSource;
}

// @Refactor: It might be easier to send the animation info instead of whichever action which the client has to infer
export enum LimbAction {
   none,
   engageBow,
   moveLimbToQuiver,
   moveLimbFromQuiver,
   pullBackArrow,
   arrowReleased,
   mainArrowReleased,
   returnFromBow,
   chargeBow,
   disengageBow,
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
   engageBlock,
   block,
   returnBlockToRest,
   feignAttack,
   windShieldBash,
   pushShieldBash,
   returnShieldBashToRest
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

export type PlantedEntityType = EntityType.treePlanted | EntityType.berryBushPlanted | EntityType.iceSpikesPlanted;