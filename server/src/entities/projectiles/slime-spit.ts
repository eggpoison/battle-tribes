import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { HealthComponentArray, SlimeSpitComponentArray } from "../../components/ComponentArray";
import { SlimeSpitComponent } from "../../components/SlimeSpitComponent";
import { createSpitPoison } from "./spit-poison";
import { damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { SERVER } from "../../server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";

const BREAK_VELOCITY = 100;

const SIZES = [20, 30];

export function createSlimeSpit(position: Point, size: number): Entity {
   const spit = new Entity(position, EntityType.slimeSpit, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxSize = SIZES[size];
   const hitbox = new RectangularHitbox(spit.position.x, spit.position.y, 0.2, 0, 0, HitboxCollisionType.soft, spit.getNextHitboxLocalID(), spit.rotation, hitboxSize, hitboxSize, 0);
   spit.addHitbox(hitbox);

   PhysicsComponentArray.addComponent(spit.id, new PhysicsComponent(true, false));
   SlimeSpitComponentArray.addComponent(spit.id, new SlimeSpitComponent(size));

   return spit;
}

export function tickSlimeSpit(spit: Entity): void {
   if (spit.velocity.lengthSquared() <= BREAK_VELOCITY * BREAK_VELOCITY) {
      spit.remove();
   }
}

export function onSlimeSpitCollision(spit: Entity, collidingEntity: Entity): void {
   if (collidingEntity.type === EntityType.slime || collidingEntity.type === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   const spitComponent = SlimeSpitComponentArray.getComponent(spit.id);
   const damage = spitComponent.size === 0 ? 2 : 3;
   const hitDirection = spit.position.calculateAngleBetween(collidingEntity.position);

   damageEntity(collidingEntity, damage, spit, PlayerCauseOfDeath.poison);
   applyKnockback(collidingEntity, 150, hitDirection);
   SERVER.registerEntityHit({
      entityPositionX: collidingEntity.position.x,
      entityPositionY: collidingEntity.position.y,
      hitEntityID: collidingEntity.id,
      damage: damage,
      knockback: 150,
      angleFromAttacker: hitDirection,
      attackerID: spit.id,
      flags: 0
   });
   
   if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
      applyStatusEffect(collidingEntity.id, StatusEffect.poisoned, 2 * Settings.TPS);
   }

   spit.remove();
}

export function onSlimeSpitDeath(spit: Entity): void {
   const spitComponent = SlimeSpitComponentArray.getComponent(spit.id);
   if (spitComponent.size === 1) {
      createSpitPoison(spit.position.copy());
   }
}