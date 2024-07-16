import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { SpikesComponentArray } from "../../components/SpikesComponent";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { createWallPunjiSticksHitboxes, createFloorPunjiSticksHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { ComponentConfig } from "../../components";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import Board from "../../Board";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.spikes;

export function createFloorPunjiSticksConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.floorPunjiSticks,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createFloorPunjiSticksHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 10
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
      [ServerComponentType.spikes]: {}
   };
}

export function createWallPunjiSticksConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.wallPunjiSticks,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createWallPunjiSticksHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 10
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
      [ServerComponentType.spikes]: {}
   };
}

export function onPunjiSticksCollision(punjiSticks: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   const collidingEntityType = Board.getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.door || collidingEntityType === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(punjiSticks);
   if (spikesComponent.isCovered && getEntityRelationship(punjiSticks, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "punjiSticks")) {
      return;
   }
   
   // @Incomplete: Cause of death
   damageEntity(collidingEntity, punjiSticks, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(healthComponent, "punjiSticks", 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TPS);
   }
}