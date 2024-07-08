import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { SpikesComponent, SpikesComponentArray } from "../../components/SpikesComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { StructureComponentArray, StructureComponent, isAttachedToWall } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { createWallSpikesHitboxes, createFloorSpikesHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export const SPIKE_HEALTHS = [15, 45];

export function createSpikes(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const isAttached = isAttachedToWall(connectionInfo);
   const entityType = isAttached ? EntityType.wallSpikes : EntityType.floorSpikes;

   const spikes = new Entity(position, rotation, entityType, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = isAttached ? createWallSpikesHitboxes() : createFloorSpikesHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      spikes.addHitbox(hitboxes[i]);
   }

   const material = BuildingMaterial.wood;
   
   HealthComponentArray.addComponent(spikes.id, new HealthComponent(SPIKE_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(spikes.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned));
   StructureComponentArray.addComponent(spikes.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(spikes.id, new TribeComponent(tribe));
   SpikesComponentArray.addComponent(spikes.id, new SpikesComponent());
   BuildingMaterialComponentArray.addComponent(spikes.id, new BuildingMaterialComponent(material));

   return spikes;
}

export function onSpikesCollision(spikes: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   if (collidingEntity.type === EntityType.floorSpikes || collidingEntity.type === EntityType.wallSpikes || collidingEntity.type === EntityType.door || collidingEntity.type === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(spikes.id);
   if (spikesComponent.isCovered && getEntityRelationship(spikes.id, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "woodenSpikes")) {
      return;
   }
   
   // @Incomplete: Cause of death
   damageEntity(collidingEntity, spikes, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(healthComponent, "woodenSpikes", 0.3);
}