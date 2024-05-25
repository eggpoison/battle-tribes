import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, PebblumComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { PebblumComponent } from "../../components/PebblumComponent";
import { moveEntityToPosition, stopEntity } from "../../ai-shared";
import Board from "../../Board";
import { SERVER } from "../../server/server";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";

const TURN_SPEED = Math.PI * 2;

export function createPebblum(position: Point, rotation: number, targetID: number): Entity {
   const pebblum = new Entity(position, rotation, EntityType.pebblum, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   // Body
   pebblum.addHitbox(new CircularHitbox(position, 0.4, 0, -4, HitboxCollisionType.soft, 10 * 2, pebblum.getNextHitboxLocalID(), pebblum.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   // Nose
   pebblum.addHitbox(new CircularHitbox(position, 0.3, 0, 6, HitboxCollisionType.soft, 8 * 2, pebblum.getNextHitboxLocalID(), pebblum.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   
   PhysicsComponentArray.addComponent(pebblum.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(pebblum.id, new HealthComponent(20));
   StatusEffectComponentArray.addComponent(pebblum.id, new StatusEffectComponent(StatusEffect.burning | StatusEffect.bleeding | StatusEffect.poisoned));
   PebblumComponentArray.addComponent(pebblum.id, new PebblumComponent(targetID));
   
   return pebblum;
}

export function tickPebblum(pebblum: Entity): void {
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum.id);

   const target = Board.entityRecord[pebblumComponent.targetEntityID];
   if (typeof target !== "undefined") {
      moveEntityToPosition(pebblum, target.position.x, target.position.y, 850, TURN_SPEED);
   } else {
      const physicsComponent = PhysicsComponentArray.getComponent(pebblum.id);
      stopEntity(physicsComponent);
   }
}

export function onPebblumCollision(pebblum: Entity, collidingEntity: Entity, collisionPoint: Point): void {
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
   damageEntity(collidingEntity, pebblum, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 100, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "pebblum", 0.3);
}