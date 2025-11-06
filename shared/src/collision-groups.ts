// When to add a collision group:
// - Adding collision groups can be expensive, the number of hash-matrix-pair checks
//   which have to be done grows quickly with each new one.
// - Collision groups should only be added when they would significantly reduce the amount
//   of collision checks which have to be done. Otherwise, for special two-entity relationships,

import { EntityType } from "./entities";

//   just manually check the entity type in the onCollision or getSoftCollisionPushFactor event.
export enum CollisionGroup {
   default,
   none,
   /** Static entities which don't have any collision events. */
   boring,
   /** Static, no mass, no collision events. Can't interact with anything, just used as decoration */
   decoration,
   /** Resources such as cacti and ice spikes which are stationary and can damage other entities (have collision events). */
   damagingResource,
   /** For non-pushing non-pushable entities whose only purpose is to damage other entities. */
   exclusiveDamaging,
   
   _LENGTH_
}

// How the collision matrix works:
// - The left-hand collision group is the group which the row contains info for.
// - true indicates that the left-hand group does experience collisions with the upper group.
// - false indicates that they don't.
// 
// Left group: pushing
// Top group: pushed

// @Cleanup: none and decoration are the same? Are there any differences (e.g. where i check collisionGroup == decoration)
const COLLISION_MATRIX: ReadonlyArray<boolean> = [
//                      Default None   Boring Decoration DamagingResource ExclusiveDamaging
/* Default           */ true,   false, true,  false,     true,            false,
/* None              */ false,  false, false, false,     false,           false,
/* Boring            */ false,  false, false, false,     false,           false,
/* Decoration        */ false,  false, false, false,     false,           false,
/* DamagingResource  */ true,   false, true,  false,     false,           false,
/* ExclusiveDamaging */ true,   false, true,  false,     true,            false
];

export function collisionGroupsCanCollide(pushingEntityCollisionGroup: CollisionGroup, pushedEntityCollisionGroup: CollisionGroup): boolean {
   const idx = pushingEntityCollisionGroup * CollisionGroup._LENGTH_ + pushedEntityCollisionGroup;
   return COLLISION_MATRIX[idx];
}

// @Speed: Make into array
// @Cleanup: If it gets to the point that there are many bits of information like this stored per-entity-type,
// then we should put them into each individual entity file and register them in one object for each entity type.
const ENTITY_COLLISION_GROUP_RECORD: Record<EntityType, CollisionGroup> = {
   [EntityType.cow]: CollisionGroup.default,
   [EntityType.zombie]: CollisionGroup.default,
   [EntityType.tombstone]: CollisionGroup.default,
   [EntityType.tree]: CollisionGroup.boring,
   [EntityType.workbench]: CollisionGroup.default,
   [EntityType.boulder]: CollisionGroup.boring,
   [EntityType.berryBush]: CollisionGroup.boring,
   [EntityType.cactus]: CollisionGroup.damagingResource,
   [EntityType.yeti]: CollisionGroup.default,
   [EntityType.iceSpikes]: CollisionGroup.damagingResource,
   [EntityType.slime]: CollisionGroup.default,
   [EntityType.slimewisp]: CollisionGroup.default,
   [EntityType.player]: CollisionGroup.default,
   [EntityType.tribeWorker]: CollisionGroup.default,
   [EntityType.tribeWarrior]: CollisionGroup.default,
   [EntityType.tribeTotem]: CollisionGroup.default,
   [EntityType.workerHut]: CollisionGroup.default,
   [EntityType.warriorHut]: CollisionGroup.default,
   [EntityType.barrel]: CollisionGroup.default,
   [EntityType.campfire]: CollisionGroup.default,
   [EntityType.furnace]: CollisionGroup.default,
   [EntityType.snowball]: CollisionGroup.default,
   [EntityType.krumblid]: CollisionGroup.default,
   [EntityType.fish]: CollisionGroup.default,
   [EntityType.itemEntity]: CollisionGroup.default,
   [EntityType.fleshSwordItemEntity]: CollisionGroup.default,
   [EntityType.woodenArrow]: CollisionGroup.default,
   [EntityType.ballistaWoodenBolt]: CollisionGroup.default,
   [EntityType.ballistaRock]: CollisionGroup.default,
   [EntityType.ballistaSlimeball]: CollisionGroup.default,
   [EntityType.ballistaFrostcicle]: CollisionGroup.default,
   [EntityType.slingTurretRock]: CollisionGroup.default,
   [EntityType.iceShardProjectile]: CollisionGroup.default,
   [EntityType.spearProjectile]: CollisionGroup.default,
   [EntityType.researchBench]: CollisionGroup.default,
   [EntityType.wall]: CollisionGroup.default,
   [EntityType.slimeSpit]: CollisionGroup.default,
   [EntityType.spitPoisonArea]: CollisionGroup.exclusiveDamaging,
   [EntityType.door]: CollisionGroup.default,
   [EntityType.battleaxeProjectile]: CollisionGroup.default,
   [EntityType.golem]: CollisionGroup.default,
   [EntityType.planterBox]: CollisionGroup.default,
   [EntityType.iceArrow]: CollisionGroup.default,
   [EntityType.pebblum]: CollisionGroup.default,
   [EntityType.embrasure]: CollisionGroup.default,
   [EntityType.tunnel]: CollisionGroup.default,
   [EntityType.floorSpikes]: CollisionGroup.default,
   [EntityType.wallSpikes]: CollisionGroup.default,
   [EntityType.floorPunjiSticks]: CollisionGroup.default,
   [EntityType.wallPunjiSticks]: CollisionGroup.default,
   [EntityType.blueprintEntity]: CollisionGroup.boring,
   [EntityType.ballista]: CollisionGroup.default,
   [EntityType.slingTurret]: CollisionGroup.default,
   [EntityType.healingTotem]: CollisionGroup.default,
   [EntityType.treePlanted]: CollisionGroup.boring,
   [EntityType.berryBushPlanted]: CollisionGroup.boring,
   [EntityType.iceSpikesPlanted]: CollisionGroup.damagingResource,
   [EntityType.fence]: CollisionGroup.default,
   [EntityType.fenceGate]: CollisionGroup.default,
   [EntityType.frostshaper]: CollisionGroup.default,
   [EntityType.stonecarvingTable]: CollisionGroup.default,
   [EntityType.grassStrand]: CollisionGroup.decoration,
   [EntityType.decoration]: CollisionGroup.decoration,
   [EntityType.riverSteppingStone]: CollisionGroup.decoration,
   [EntityType.reed]: CollisionGroup.decoration,
   [EntityType.lilypad]: CollisionGroup.default,
   [EntityType.fibrePlant]: CollisionGroup.default,
   [EntityType.guardian]: CollisionGroup.default,
   [EntityType.guardianGemQuake]: CollisionGroup.exclusiveDamaging,
   [EntityType.guardianGemFragmentProjectile]: CollisionGroup.default,
   [EntityType.guardianSpikyBall]: CollisionGroup.default,
   [EntityType.bracings]: CollisionGroup.default,
   [EntityType.fireTorch]: CollisionGroup.default,
   [EntityType.spikyBastard]: CollisionGroup.exclusiveDamaging,
   [EntityType.glurbHeadSegment]: CollisionGroup.default,
   [EntityType.glurbBodySegment]: CollisionGroup.default,
   [EntityType.glurbTailSegment]: CollisionGroup.default,
   [EntityType.slurbTorch]: CollisionGroup.default,
   [EntityType.treeRootBase]: CollisionGroup.boring,
   [EntityType.treeRootSegment]: CollisionGroup.boring,
   [EntityType.mithrilOreNode]: CollisionGroup.boring,
   [EntityType.scrappy]: CollisionGroup.default,
   [EntityType.cogwalker]: CollisionGroup.default,
   [EntityType.automatonAssembler]: CollisionGroup.boring,
   [EntityType.mithrilAnvil]: CollisionGroup.boring,
   [EntityType.swingAttack]: CollisionGroup.exclusiveDamaging,
   [EntityType.blockAttack]: CollisionGroup.default,
   [EntityType.moss]: CollisionGroup.decoration,
   [EntityType.floorSign]: CollisionGroup.boring,
   [EntityType.desertBushLively]: CollisionGroup.boring,
   [EntityType.desertBushSandy]: CollisionGroup.boring,
   [EntityType.desertSmallWeed]: CollisionGroup.boring,
   [EntityType.desertShrub]: CollisionGroup.boring,
   [EntityType.tumbleweedLive]: CollisionGroup.boring,
   [EntityType.tumbleweedDead]: CollisionGroup.default,
   [EntityType.palmTree]: CollisionGroup.boring,
   [EntityType.pricklyPear]: CollisionGroup.boring,
   [EntityType.pricklyPearFragmentProjectile]: CollisionGroup.default,
   [EntityType.dustflea]: CollisionGroup.default,
   [EntityType.sandstoneRock]: CollisionGroup.boring,
   [EntityType.okren]: CollisionGroup.default,
   [EntityType.okrenClaw]: CollisionGroup.default,
   [EntityType.dustfleaMorphCocoon]: CollisionGroup.boring,
   [EntityType.sandBall]: CollisionGroup.default,
   [EntityType.krumblidMorphCocoon]: CollisionGroup.boring,
   [EntityType.okrenTongue]: CollisionGroup.default,
   [EntityType.dustfleaEgg]: CollisionGroup.default,
   [EntityType.spruceTree]: CollisionGroup.boring,
   [EntityType.tundraRock]: CollisionGroup.boring,
   [EntityType.tundraRockFrozen]: CollisionGroup.boring,
   [EntityType.snowberryBush]: CollisionGroup.boring,
   [EntityType.snobe]: CollisionGroup.default,
   [EntityType.snobeMound]: CollisionGroup.boring,
   [EntityType.inguSerpent]: CollisionGroup.default,
   [EntityType.tukmok]: CollisionGroup.default,
   [EntityType.tukmokTrunk]: CollisionGroup.default,
   [EntityType.tukmokTailClub]: CollisionGroup.default,
   [EntityType.tukmokSpur]: CollisionGroup.default,
   [EntityType.inguYetuksnoglurblidokowflea]: CollisionGroup.default,
   [EntityType.inguYetuksnoglurblidokowfleaSeekerHead]: CollisionGroup.default,
   [EntityType.inguYetukLaser]: CollisionGroup.default,
};

export function getEntityCollisionGroup(entityType: EntityType): CollisionGroup {
   return ENTITY_COLLISION_GROUP_RECORD[entityType];
}