import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { SpikesComponent, SpikesComponentArray } from "../../components/SpikesComponent";
import { StructureComponentArray, StructureComponent, isAttachedToWall } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { createWallPunjiSticksHitboxes, createFloorPunjiSticksHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createPunjiSticks(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const isAttached = isAttachedToWall(connectionInfo);
   const entityType = isAttached ? EntityType.wallPunjiSticks : EntityType.floorPunjiSticks;
   
   const punjiSticks = new Entity(position, rotation, entityType, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = isAttached ? createWallPunjiSticksHitboxes() : createFloorPunjiSticksHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      punjiSticks.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(punjiSticks.id, new HealthComponent(10));
   StatusEffectComponentArray.addComponent(punjiSticks.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned));
   StructureComponentArray.addComponent(punjiSticks.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(punjiSticks.id, new TribeComponent(tribe));
   SpikesComponentArray.addComponent(punjiSticks.id, new SpikesComponent());

   return punjiSticks;
}

export function onPunjiSticksCollision(punjiSticks: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   if (collidingEntity.type === EntityType.floorSpikes || collidingEntity.type === EntityType.wallSpikes || collidingEntity.type === EntityType.door || collidingEntity.type === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(punjiSticks.id);
   if (spikesComponent.isCovered && getEntityRelationship(punjiSticks.id, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "punjiSticks")) {
      return;
   }
   
   // @Incomplete: Cause of death
   damageEntity(collidingEntity, punjiSticks, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(healthComponent, "punjiSticks", 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
      applyStatusEffect(collidingEntity.id, StatusEffect.poisoned, 2 * Settings.TPS);
   }
}