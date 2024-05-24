import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
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
import { EntityCreationInfo } from "../../entity-components";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.slimeSpit];

const BREAK_VELOCITY = 100;

const SIZES = [20, 30];

export function createSlimeSpit(position: Point, rotation: number, size: number): EntityCreationInfo<ComponentTypes> {
   const spit = new Entity(position, rotation, EntityType.slimeSpit, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxSize = SIZES[size];
   const hitbox = new RectangularHitbox(position, 0.2, 0, 0, HitboxCollisionType.soft, spit.getNextHitboxLocalID(), spit.rotation, hitboxSize, hitboxSize, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   spit.addHitbox(hitbox);

   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, false);
   PhysicsComponentArray.addComponent(spit.id, physicsComponent);

   const slimeSpitComponent = new SlimeSpitComponent(size);
   SlimeSpitComponentArray.addComponent(spit.id, slimeSpitComponent);

   return {
      entity: spit,
      components: {
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.slimeSpit]: slimeSpitComponent
      }
   };
}

export function tickSlimeSpit(spit: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(spit.id);
   if (physicsComponent.velocity.lengthSquared() <= BREAK_VELOCITY * BREAK_VELOCITY) {
      spit.destroy();
   }
}

export function onSlimeSpitCollision(spit: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   if (collidingEntity.type === EntityType.slime || collidingEntity.type === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   const spitComponent = SlimeSpitComponentArray.getComponent(spit.id);
   const damage = spitComponent.size === 0 ? 2 : 3;
   const hitDirection = spit.position.calculateAngleBetween(collidingEntity.position);

   damageEntity(collidingEntity, spit, damage, PlayerCauseOfDeath.poison, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 150, hitDirection);
   
   if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
      applyStatusEffect(collidingEntity.id, StatusEffect.poisoned, 2 * Settings.TPS);
   }

   spit.destroy();
}

export function onSlimeSpitDeath(spit: Entity): void {
   const spitComponent = SlimeSpitComponentArray.getComponent(spit.id);
   if (spitComponent.size === 1) {
      createSpitPoison(spit.position.copy(), 2 * Math.PI * Math.random());
   }
}