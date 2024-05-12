import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, PebblumComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { PebblumComponent } from "../../components/PebblumComponent";
import { stopEntity } from "../../ai-shared";
import Board from "../../Board";
import { SERVER } from "../../server";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";

export function createPebblum(position: Point, targetID: number): Entity {
   const pebblum = new Entity(position, EntityType.pebblum, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   // Body
   pebblum.addHitbox(new CircularHitbox(pebblum.position.x, pebblum.position.y, 0.4, 0, -4, HitboxCollisionType.soft, 10 * 2, pebblum.getNextHitboxLocalID(), pebblum.rotation));
   // Nose
   pebblum.addHitbox(new CircularHitbox(pebblum.position.x, pebblum.position.y, 0.3, 0, 6, HitboxCollisionType.soft, 8 * 2, pebblum.getNextHitboxLocalID(), pebblum.rotation));
   
   PhysicsComponentArray.addComponent(pebblum.id, new PhysicsComponent(true, false));
   HealthComponentArray.addComponent(pebblum.id, new HealthComponent(20));
   StatusEffectComponentArray.addComponent(pebblum.id, new StatusEffectComponent(StatusEffect.burning | StatusEffect.bleeding | StatusEffect.poisoned));
   PebblumComponentArray.addComponent(pebblum.id, new PebblumComponent(targetID));
   
   return pebblum;
}

export function tickPebblum(pebblum: Entity): void {
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum.id);

   if (pebblumComponent.targetEntityID === 0 || !Board.entityRecord.hasOwnProperty(pebblumComponent.targetEntityID)) {
      // @Incomplete
      stopEntity(pebblum);
      return;
   }

   const target = Board.entityRecord[pebblumComponent.targetEntityID]!;

   const direction = pebblum.position.calculateAngleBetween(target.position);
   if (direction !== pebblum.rotation) {
      pebblum.rotation = direction;

      const physicsComponent = PhysicsComponentArray.getComponent(pebblum.id);
      physicsComponent.hitboxesAreDirty = true;
   }
   pebblum.acceleration.x = 850 * Math.sin(pebblum.rotation);
   pebblum.acceleration.y = 850 * Math.cos(pebblum.rotation);
}

export function onPebblumCollision(pebblum: Entity, collidingEntity: Entity): void {
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum.id);
   if (collidingEntity.id !== pebblumComponent.targetEntityID) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "pebblum")) {
      return;
   }
   
   const hitDirection = pebblum.position.calculateAngleBetween(collidingEntity.position);
   // @Incomplete: Cause of death
   damageEntity(collidingEntity, 1, pebblum, PlayerCauseOfDeath.yeti, "pebblum");
   applyKnockback(collidingEntity, 100, hitDirection);
   SERVER.registerEntityHit({
      entityPositionX: collidingEntity.position.x,
      entityPositionY: collidingEntity.position.y,
      hitEntityID: collidingEntity.id,
      damage: 1,
      knockback: 100,
      angleFromAttacker: hitDirection,
      attackerID: pebblum.id,
      flags: 0
   });
   addLocalInvulnerabilityHash(healthComponent, "pebblum", 0.3);
}