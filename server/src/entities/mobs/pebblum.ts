import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { PebblumComponent, PebblumComponentArray } from "../../components/PebblumComponent";
import { moveEntityToPosition, stopEntity } from "../../ai-shared";
import Board from "../../Board";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const TURN_SPEED = Math.PI * 2;

export function createPebblum(position: Point, rotation: number, targetID: number): Entity {
   const pebblum = new Entity(position, rotation, EntityType.pebblum, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   // Body
   pebblum.addHitbox(new CircularHitbox(0.4, new Point(0, -4), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 10 * 2));
   // Nose
   pebblum.addHitbox(new CircularHitbox(0.3, new Point(0, 6), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 8 * 2));
   
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