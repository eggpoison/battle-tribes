import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { SpikesComponentArray } from "../../components/SpikesComponent";
import { createEmptyStructureConnectionInfo } from "battletribes-shared/structures";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { createWallSpikesHitboxes, createFloorSpikesHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { ComponentConfig } from "../../components";
import { getEntityType } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.buildingMaterial
   | ServerComponentType.spikes;

export function createFloorSpikesConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.floorSpikes,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createFloorSpikesHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding | StatusEffect.poisoned
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.buildingMaterial]: {
         material: BuildingMaterial.wood
      },
      [ServerComponentType.spikes]: {}
   };
}

export function createWallSpikesConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.wallSpikes,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createWallSpikesHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding | StatusEffect.poisoned
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.buildingMaterial]: {
         material: BuildingMaterial.wood
      },
      [ServerComponentType.spikes]: {}
   };
}

// @Cleanup: Copy and paste
export function onSpikesCollision(spikes: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.door || collidingEntityType === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(spikes);
   if (spikesComponent.isCovered && getEntityRelationship(spikes, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "woodenSpikes")) {
      return;
   }
   
   // @Incomplete: Cause of death
   damageEntity(collidingEntity, spikes, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(healthComponent, "woodenSpikes", 0.3);
}