import { Entity, EntityType } from "./entities";
import { ItemType } from "./items/items";
import { Settings } from "./settings";
import { StatusEffect } from "./status-effects";

/*
data sent:
- Array of components (corresponding to the array of component types)

in server:
- 
*/

export enum ServerComponentType {
   aiHelper,
   berryBush,
   blueprint,
   boulder,
   cactus,
   cooking,
   cow,
   door,
   fish,
   golem,
   health,
   hut,
   iceShard,
   iceSpikes,
   inventory,
   inventoryUse,
   item,
   fleshSwordItem,
   pebblum,
   player,
   slime,
   slimeSpit,
   slimewisp,
   snowball,
   statusEffect,
   throwingProjectile,
   tombstone,
   // Cleanup: rename to just "tribeTotem" (the client uses it for more than just its banners)
   totemBanner,
   tree,
   tribe,
   tribeMember,
   tribesman,
   tribesmanAI,
   turret,
   yeti,
   zombie,
   ammoBox,
   researchBench,
   tunnel,
   buildingMaterial,
   spikes,
   punjiSticks,
   tribeWarrior,
   healingTotem,
   planterBox,
   planted,
   treePlanted,
   berryBushPlanted,
   iceSpikesPlanted,
   structure,
   fence,
   fenceGate,
   craftingStation,
   transform,
   projectile,
   iceArrow,
   layeredRod,
   decoration,
   riverSteppingStone,
   spitPoisonArea,
   battleaxeProjectile,
   spearProjectile,
   krumblid,
   guardian,
   guardianGemQuake,
   guardianGemFragmentProjectile,
   guardianSpikyBall,
   bracings,
   ballista,
   slingTurret,
   barrel,
   campfire,
   furnace,
   fireTorch,
   spikyBastard,
   glurbHeadSegment,
   glurbBodySegment,
   glurbSegment,
   slurbTorch,
   attackingEntities,
   aiAssignment,
   treeRootBase,
   treeRootSegment,
   mithrilOreNode,
   scrappy,
   cogwalker,
   automatonAssembler,
   mithrilAnvil,
   rideable,
   heldItem,
   slingTurretRock,
   taming,
   loot,
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
   energyStore,
   energyStomach,
   dustflea,
   sandstoneRock,
   okren,
   okrenClaw,
   dustfleaMorphCocoon,
   sandBall,
   krumblidMorphCocoon,
   okrenTongue,
   aiPathfinding,
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
   inguYetukLaser,
}

export const ServerComponentTypeString: Record<ServerComponentType, string> = {
   [ServerComponentType.aiHelper]: "AI Helper Component",
   [ServerComponentType.berryBush]: "Berry Bush Component",
   [ServerComponentType.blueprint]: "Blueprint Component",
   [ServerComponentType.boulder]: "Boulder Component",
   [ServerComponentType.cactus]: "Cactus Component",
   [ServerComponentType.cooking]: "Cooking Component",
   [ServerComponentType.cow]: "Cow Component",
   [ServerComponentType.door]: "Foor Component",
   [ServerComponentType.fish]: "Fish Component",
   [ServerComponentType.golem]: "Golem Component",
   [ServerComponentType.health]: "Health Component",
   [ServerComponentType.hut]: "Hut Component",
   [ServerComponentType.iceShard]: "Ice Shard Component",
   [ServerComponentType.iceSpikes]: "Ice Spikes Component",
   [ServerComponentType.inventory]: "Inventory Component",
   [ServerComponentType.inventoryUse]: "Inventory Use Component",
   [ServerComponentType.item]: "Item Component",
   [ServerComponentType.fleshSwordItem]: "Flesh Sword Item Component",
   [ServerComponentType.pebblum]: "Pebblum Component",
   [ServerComponentType.player]: "Player Component",
   [ServerComponentType.slime]: "Slime Component",
   [ServerComponentType.slimeSpit]: "Slime Spit Component",
   [ServerComponentType.slimewisp]: "Slimewisp Component",
   [ServerComponentType.snowball]: "Snowball Component",
   [ServerComponentType.statusEffect]: "Status Effect Component",
   [ServerComponentType.throwingProjectile]: "Throwing Projectile Component",
   [ServerComponentType.tombstone]: "Tombstone Component",
   [ServerComponentType.totemBanner]: "Totem Banner Component",
   [ServerComponentType.tree]: "Tree Component",
   [ServerComponentType.tribe]: "Tribe Component",
   [ServerComponentType.tribeMember]: "Tribe Member Component",
   [ServerComponentType.tribesman]: "Tribesman Component",
   [ServerComponentType.tribesmanAI]: "Tribesman AI Component",
   [ServerComponentType.turret]: "Turret Component",
   [ServerComponentType.yeti]: "Yeti Component",
   [ServerComponentType.zombie]: "Zombie Component",
   [ServerComponentType.ammoBox]: "Ammo Box Component",
   [ServerComponentType.researchBench]: "Research Bench Component",
   [ServerComponentType.tunnel]: "Tunnel Component",
   [ServerComponentType.buildingMaterial]: "Building Material Component",
   [ServerComponentType.spikes]: "Spikes Component",
   [ServerComponentType.punjiSticks]: "Punji Sticks Component",
   [ServerComponentType.tribeWarrior]: "Tribe Warrior Component",
   [ServerComponentType.healingTotem]: "Healing Totem Component",
   [ServerComponentType.planterBox]: "Planter Box Component",
   [ServerComponentType.planted]: "Planted Component",
   [ServerComponentType.treePlanted]: "Tree Planted Component",
   [ServerComponentType.berryBushPlanted]: "Berry Bush Planted Component",
   [ServerComponentType.iceSpikesPlanted]: "Ice Spikes Planted Component",
   [ServerComponentType.structure]: "Structure Component",
   [ServerComponentType.fence]: "Fence Component",
   [ServerComponentType.fenceGate]: "Fence Gate Component",
   [ServerComponentType.craftingStation]: "Crafting Station Component",
   [ServerComponentType.transform]: "Transform Component",
   [ServerComponentType.projectile]: "Projectile Component",
   [ServerComponentType.iceArrow]: "Ice Arrow Component",
   [ServerComponentType.layeredRod]: "Layered Rod Component",
   [ServerComponentType.decoration]: "Decoration Component",
   [ServerComponentType.riverSteppingStone]: "River Stepping Stone Component",
   [ServerComponentType.spitPoisonArea]: "Spit Poison Area Component",
   [ServerComponentType.battleaxeProjectile]: "Battleaxe Projectile Component",
   [ServerComponentType.spearProjectile]: "Spear Projectile Component",
   [ServerComponentType.krumblid]: "Krumblid Component",
   [ServerComponentType.guardian]: "Guardian Component",
   [ServerComponentType.guardianGemQuake]: "Guardian Gem Quake Component",
   [ServerComponentType.guardianGemFragmentProjectile]: "Guardian Gem Fragment Projectile Component",
   [ServerComponentType.guardianSpikyBall]: "Guardian Spiky Ball Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.bracings]: "Bracings Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.ballista]: "Ballsita Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.slingTurret]: "Sling Turret Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.barrel]: "Barrel Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.campfire]: "Campfire Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.furnace]: "Furnace Component",
   [ServerComponentType.fireTorch]: "Fire Torch Component",
   [ServerComponentType.spikyBastard]: "Spiky Bastard Component",
   [ServerComponentType.glurbHeadSegment]: "Glurb Head Segment Component",
   [ServerComponentType.glurbBodySegment]: "Glurb Body Segment Component",
   [ServerComponentType.glurbSegment]: "Glurb Segment Component",
   [ServerComponentType.slurbTorch]: "Slurb Torch Component",
   [ServerComponentType.attackingEntities]: "Attacking Entities Component",
   [ServerComponentType.aiAssignment]: "AI Assignment Component",
   [ServerComponentType.treeRootBase]: "Tree Root Base Component",
   [ServerComponentType.treeRootSegment]: "Tree Root Segment Component",
   [ServerComponentType.mithrilOreNode]: "Mithril Ore Node Component",
   [ServerComponentType.scrappy]: "Scrappy Component",
   [ServerComponentType.cogwalker]: "Cogwalker Component",
   [ServerComponentType.automatonAssembler]: "Automaton Assembler Component",
   [ServerComponentType.mithrilAnvil]: "Mithril Anvil Component",
   [ServerComponentType.rideable]: "Rideable Component",
   [ServerComponentType.heldItem]: "Held Item Component",
   [ServerComponentType.slingTurretRock]: "Sling Turret Rock Component",
   [ServerComponentType.taming]: "Taming Component",
   [ServerComponentType.loot]: "Loot Component",
   [ServerComponentType.moss]: "Moss Component",
   [ServerComponentType.floorSign]: "Floor Sign",
   [ServerComponentType.desertBushLively]: "Desert Bush Lively Component",
   [ServerComponentType.desertBushSandy]: "Desert Bush Sandy Component",
   [ServerComponentType.desertSmallWeed]: "Desert Small Weed Component",
   [ServerComponentType.desertShrub]: "Desert Shrub Component",
   [ServerComponentType.tumbleweedLive]: "Tumbleweed Live Component",
   [ServerComponentType.tumbleweedDead]: "Tumbleweed Dead Component",
   [ServerComponentType.palmTree]: "Palm Tree Component",
   [ServerComponentType.pricklyPear]: "Prickly Pear Component",
   [ServerComponentType.pricklyPearFragmentProjectile]: "Prickly Pear Fragment Projectile Component",
   [ServerComponentType.energyStore]: "Energy Store Component",
   [ServerComponentType.energyStomach]: "Energy Stomach Component",
   [ServerComponentType.dustflea]: "Dustflea Component",
   [ServerComponentType.sandstoneRock]: "Sandstone Rock Component",
   [ServerComponentType.okren]: "Okren Component",
   [ServerComponentType.okrenClaw]: "Okren Claw Component",
   [ServerComponentType.dustfleaMorphCocoon]: "Dustflea Morph Cocoon Component",
   [ServerComponentType.sandBall]: "Sand Ball Component",
   [ServerComponentType.krumblidMorphCocoon]: "Krumblid Morph Cocoon Component",
   [ServerComponentType.okrenTongue]: "Okren Tongue Component",
   [ServerComponentType.aiPathfinding]: "AI Pathfinding Component",
   [ServerComponentType.dustfleaEgg]: "Dustflea Egg Component",
   [ServerComponentType.spruceTree]: "Spruce Tree Component",
   [ServerComponentType.tundraRock]: "Tundra Rock Component",
   [ServerComponentType.tundraRockFrozen]: "Tundra Frozen Rock Component",
   [ServerComponentType.snowberryBush]: "Snowberry Bush Component",
   [ServerComponentType.snobe]: "Snobe Component",
   [ServerComponentType.snobeMound]: "Snobe Mound Component",
   [ServerComponentType.inguSerpent]: "Ingu Serpent Component",
   [ServerComponentType.tukmok]: "Tukmok Component",
   [ServerComponentType.tukmokTrunk]: "Tukmok Trunk Component",
   [ServerComponentType.tukmokTailClub]: "Tukmok Tail Component",
   [ServerComponentType.tukmokSpur]: "Tukmok Spur Component",
   [ServerComponentType.inguYetuksnoglurblidokowflea]: "Ingu-Yetuksnoglurblidokowflea Component",
   [ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead]: "Ingu-Yetuksnoglurblidokowflea Seeker Head Component",
   [ServerComponentType.inguYetukLaser]: "Ingu-Yetuk Laser Component",
};

export const NUM_COMPONENTS = Object.keys(ServerComponentTypeString).length;

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
   fenceGate,
   stoneBracings,
   scrappy,
   cogwalker
}

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
   recruiting,
   planting,
   changeLayers,
   moveToBiome
}


// @Robustness
export type TurretEntityType = EntityType.slingTurret | EntityType.ballista;

export type TurretAmmoType = ItemType.wood | ItemType.rock | ItemType.slimeball | ItemType.frostcicle;
export const TURRET_AMMO_TYPES: Record<TurretEntityType, ReadonlyArray<TurretAmmoType>> = {
   [EntityType.slingTurret]: [ItemType.rock],
   [EntityType.ballista]: [ItemType.wood, ItemType.rock, ItemType.slimeball, ItemType.frostcicle]
};

export enum TunnelDoorSide {
   top = 0b01,
   bottom = 0b10
}

export type TunnelDoorSides = TunnelDoorSide.top | TunnelDoorSide.bottom;

export enum BuildingMaterial {
   wood,
   stone
}

export const MATERIAL_TO_ITEM_MAP: Record<BuildingMaterial, ItemType> = {
   [BuildingMaterial.wood]: ItemType.wood,
   [BuildingMaterial.stone]: ItemType.rock
};

export interface ScarInfo {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
   readonly type: number;
}

export interface HealingTotemTargetData {
   readonly entity: Entity;
   readonly x: number;
   readonly y: number;
   readonly ticksHealed: number;
}

export enum DecorationType {
   pebble,
   rock,
   sandstoneRock,
   sandstoneRockBig1,
   sandstoneRockBig2,
   sandstoneRockDark,
   sandstoneRockDarkBig1,
   sandstoneRockDarkBig2,
   flower1,
   flower2,
   flower3,
   flower4
}

// @Cleanup: Should these be here?

// export enum BallistaProjectileType {
//    woodenBolt,
//    rock,
//    slimeball,
//    frostcicle
// }

export interface ArrowStatusEffectInfo {
   readonly type: StatusEffect;
   readonly durationTicks: number;
}

export interface GenericAmmoInfo {
   // readonly projectileType: BallistaProjectileType;
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

export const AMMO_INFO_RECORD: Record<TurretAmmoType, GenericAmmoInfo> = {
   [ItemType.wood]: {
      // projectileType: BallistaProjectileType.woodenBolt,
      damage: 5,
      knockback: 150,
      shotCooldownTicks: 2.5 * Settings.TICK_RATE,
      reloadTimeTicks: Math.floor(0.4 * Settings.TICK_RATE),
      projectileSpeed: 1100,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 3,
      statusEffect: null
   },
   [ItemType.rock]: {
      // projectileType: GenericArrowType.ballistaRock,
      damage: 8,
      knockback: 350,
      shotCooldownTicks: 3 * Settings.TICK_RATE,
      reloadTimeTicks: Math.floor(0.5 * Settings.TICK_RATE),
      projectileSpeed: 1000,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 3,
      statusEffect: null
   },
   [ItemType.slimeball]: {
      // projectileType: GenericArrowType.ballistaSlimeball,
      damage: 3,
      knockback: 0,
      shotCooldownTicks: 2 * Settings.TICK_RATE,
      reloadTimeTicks: Math.floor(0.4 * Settings.TICK_RATE),
      projectileSpeed: 800,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 4,
      statusEffect: {
         type: StatusEffect.poisoned,
         durationTicks: 2.5 * Settings.TICK_RATE
      }
   },
   [ItemType.frostcicle]: {
      // projectileType: GenericArrowType.ballistaFrostcicle,
      damage: 1,
      knockback: 50,
      shotCooldownTicks: 0.5 * Settings.TICK_RATE,
      reloadTimeTicks: Math.floor(0.15 * Settings.TICK_RATE),
      projectileSpeed: 1500,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 6,
      statusEffect: {
         type: StatusEffect.freezing,
         durationTicks: 1 * Settings.TICK_RATE
      }
   }
};
















// @Cleanup: Should be defined in server
export enum GuardianAttackType {
   none,
   crystalSlam,
   crystalBurst,
   summonSpikyBalls
}

// @Cleanup: Should be defined in server
export enum GuardianCrystalSlamStage {
   windup,
   slam,
   return
}

// @Cleanup: Should be defined in server
export enum GuardianCrystalBurstStage {
   windup,
   burst,
   return
}

// @Cleanup: Should be defined in server
export enum GuardianSpikyBallSummonStage {
   windup,
   focus,
   return
}





// @Cleanup: Should be defined in server
export enum BlockType {
   toolBlock,
   shieldBlock
}