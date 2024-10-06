// When to add a collision group:
// - Adding collision groups can be expensive, the number of hash-matrix-pair checks
//   which have to be done grows quickly with each new one.
// - Collision groups should only be added when they would significantly reduce the amount
//   of collision checks which have to be done. Otherwise, for special two-entity relationships,
//   just manually check the entity type in the onCollision or getSoftCollisionPushFactor event.
export const enum CollisionGroup {
   default,
   none,
   /** Static entities which don't have any collision events. */
   boring,
   decoration,
   /** Resources such as cacti and ice spikes which are stationary and can damage other entities (have collision events). */
   damagingResource,
   /** For static non-pushing entities whose only purpose is to damage other entities. */
   exclusiveDamaging,
   
   _LENGTH_
}

// How a collision matrix works:
// - The left-hand collision group is the group which the row contains info for.
// - true indicates that the left-hand group does experience collisions with the upper group.
// - false indicates that they don't.
// 
// Left group: pushing
// Top group: pushed

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