import { EntityType } from "battletribes-shared/entities";

interface ClientEntityInfo {
   readonly name: string;
}

const CLIENT_ENTITY_INFO_RECORD: Record<EntityType, ClientEntityInfo> = {
   [EntityType.cow]: {
      name: "Cow"
   },
   [EntityType.zombie]: {
      name: "Zombie"
   },
   [EntityType.tombstone]: {
      name: "Tombstone"
   },
   [EntityType.tree]: {
      name: "Tree"
   },
   [EntityType.workbench]: {
      name: "Workbench"
   },
   [EntityType.boulder]: {
      name: "Boulder"
   },
   [EntityType.berryBush]: {
      name: "Berry Bush"
   },
   [EntityType.cactus]: {
      name: "Cactus"
   },
   [EntityType.yeti]: {
      name: "Yeti"
   },
   [EntityType.iceSpikes]: {
      name: "Ice Spikes"
   },
   [EntityType.slime]: {
      name: "Slime"
   },
   [EntityType.slimewisp]: {
      name: "Slimewisp"
   },
   [EntityType.player]: {
      name: "Player"
   },
   [EntityType.tribeWorker]: {
      name: "Tribe Worker"
   },
   [EntityType.tribeWarrior]: {
      name: "Tribe Warrior"
   },
   [EntityType.tribeTotem]: {
      name: "Tribe Totem"
   },
   [EntityType.workerHut]: {
      name: "Worker Hut"
   },
   [EntityType.warriorHut]: {
      name: "Warrior Hut"
   },
   [EntityType.barrel]: {
      name: "Barrel"
   },
   [EntityType.campfire]: {
      name: "Campfire"
   },
   [EntityType.furnace]: {
      name: "Furnace"
   },
   [EntityType.snowball]: {
      name: "Snowball"
   },
   [EntityType.krumblid]: {
      name: "Krumblid"
   },
   [EntityType.frozenYeti]: {
      name: "Frozen Yeti"
   },
   [EntityType.fish]: {
      name: "Fish"
   },
   [EntityType.itemEntity]: {
      name: "Item Entity"
   },
   [EntityType.woodenArrow]: {
      name: "Wooden Arrow Projectile"
   },
   [EntityType.ballistaFrostcicle]: {
      name: "Ballista Frostcicle Projectile"
   },
   [EntityType.ballistaRock]: {
      name: "Ballista Rock Projectile"
   },
   [EntityType.ballistaSlimeball]: {
      name: "Ballista Slimeball Projectile"
   },
   [EntityType.ballistaWoodenBolt]: {
      name: "Ballista Wooden Bolt Projectile"
   },
   [EntityType.slingTurretRock]: {
      name: "Sling Turret Rock Projectile"
   },
   [EntityType.iceShardProjectile]: {
      name: "Ice Shard Projectile"
   },
   [EntityType.rockSpikeProjectile]: {
      name: "Rock Spike Projectile"
   },
   [EntityType.spearProjectile]: {
      name: "Spear Projectile"
   },
   [EntityType.researchBench]: {
      name: "Research Bench"
   },
   [EntityType.wall]: {
      name: "Wall"
   },
   [EntityType.slimeSpit]: {
      name: "Slime Spit"
   },
   [EntityType.spitPoisonArea]: {
      name: "Spit Poison Area"
   },
   [EntityType.door]: {
      name: "Door"
   },
   [EntityType.battleaxeProjectile]: {
      name: "Battleaxe Projectile"
   },
   [EntityType.golem]: {
      name: "Golem"
   },
   [EntityType.planterBox]: {
      name: "Planter Box"
   },
   [EntityType.iceArrow]: {
      name: "Ice Arrow"
   },
   [EntityType.pebblum]: {
      name: "Pebblum"
   },
   [EntityType.embrasure]: {
      name: "Embrasure"
   },
   [EntityType.tunnel]: {
      name: "Tunnel"
   },
   [EntityType.floorSpikes]: {
      name: "Floor Spikes"
   },
   [EntityType.wallSpikes]: {
      name: "Wall Spikes"
   },
   [EntityType.floorPunjiSticks]: {
      name: "Floor Punji Sticks"
   },
   [EntityType.wallPunjiSticks]: {
      name: "Wall Punji Sticks"
   },
   [EntityType.blueprintEntity]: {
      name: "Blueprint Entity"
   },
   [EntityType.ballista]: {
      name: "Ballista"
   },
   [EntityType.slingTurret]: {
      name: "Sling Turret"
   },
   [EntityType.healingTotem]: {
      name: "Healing Totem"
   },
   [EntityType.plant]: {
      name: "Plant"
   },
   [EntityType.fence]: {
      name: "Fence"
   },
   [EntityType.fenceGate]: {
      name: "Fence Gate"
   },
   [EntityType.frostshaper]: {
      name: "Frostshaper"
   },
   [EntityType.stonecarvingTable]: {
      name: "Stonecarving Table"
   },
   [EntityType.grassStrand]: {
      name: "Grass Strand"
   },
   [EntityType.decoration]: {
      name: "Decoration"
   },
   [EntityType.reed]: {
      name: "Reed"
   },
   [EntityType.lilypad]: {
      name: "Lilypad"
   },
   [EntityType.fibrePlant]: {
      name: "Fibre Plant"
   },
   [EntityType.guardian]: {
      name: "Fibre Plant"
   }
};

export default CLIENT_ENTITY_INFO_RECORD;