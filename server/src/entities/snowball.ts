import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { SnowballSize, EntityType, SNOWBALL_SIZES, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randFloat, randSign } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import { HealthComponentArray, SnowballComponentArray } from "../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../components/StatusEffectComponent";
import { SnowballComponent } from "../components/SnowballComponent";
import { SERVER } from "../server/server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../components/PhysicsComponent";
import { EntityCreationInfo } from "../entity-components";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
   
type ComponentTypes = [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.snowball];

const MAX_HEALTHS: ReadonlyArray<number> = [1, 3];

const DAMAGE_VELOCITY_THRESHOLD = 100;

export function createSnowball(position: Point, size: SnowballSize = SnowballSize.small, yetiID: number = 0): EntityCreationInfo<ComponentTypes> {
   const snowball = new Entity(position, 2 * Math.PI * Math.random(), EntityType.snowball, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const mass = size === SnowballSize.small ? 1 : 1.5;
   const hitbox = new CircularHitbox(position, mass, 0, 0, HitboxCollisionType.soft, SNOWBALL_SIZES[size] / 2, snowball.getNextHitboxLocalID(), snowball.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   snowball.addHitbox(hitbox);

   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, false);
   PhysicsComponentArray.addComponent(snowball.id, physicsComponent);

   /** Set the snowball to spin */
   physicsComponent.angularVelocity = randFloat(1, 2) * Math.PI * randSign();

   const healthComponent = new HealthComponent(MAX_HEALTHS[size]);
   HealthComponentArray.addComponent(snowball.id, healthComponent);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing);
   StatusEffectComponentArray.addComponent(snowball.id, statusEffectComponent);

   const snowballComponent = new SnowballComponent(yetiID, size, Math.floor(randFloat(10, 15) * Settings.TPS));
   SnowballComponentArray.addComponent(snowball.id, snowballComponent);
   
   return {
      entity: snowball,
      components: {
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.snowball]: snowballComponent
      }
   };
}

export function tickSnowball(snowball: Entity): void {
   const snowballComponent = SnowballComponentArray.getComponent(snowball.id);
   
   // @Incomplete. we use physics component angular velocity now, but that doesn't decrease over time!
   // Angular velocity
   // if (snowballComponent.angularVelocity !== 0) {
   //    snowball.rotation += snowballComponent.angularVelocity / Settings.TPS;

   //    const physicsComponent = PhysicsComponentArray.getComponent(snowball.id);
   //    physicsComponent.hitboxesAreDirty = true;
      
   //    const beforeSign = Math.sign(snowballComponent.angularVelocity);
   //    snowballComponent.angularVelocity -= Math.PI / Settings.TPS * beforeSign;
   //    if (beforeSign !== Math.sign(snowballComponent.angularVelocity)) {
   //       snowballComponent.angularVelocity = 0;
   //    }
   // }

   if (snowball.ageTicks >= snowballComponent.lifetimeTicks) {
      snowball.destroy();
   }
}

export function onSnowballCollision(snowball: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   if (collidingEntity.type === EntityType.snowball) {
      return;
   }

   // Don't let the snowball damage the yeti which threw it
   if (collidingEntity.type === EntityType.yeti) {
      const snowballComponent = SnowballComponentArray.getComponent(snowball.id);
      if (collidingEntity.id === snowballComponent.yetiID) {
         return;
      }
   }
   
   const physicsComponent = PhysicsComponentArray.getComponent(snowball.id);
   if (physicsComponent.velocity.length() < DAMAGE_VELOCITY_THRESHOLD || snowball.ageTicks >= 2 * Settings.TPS) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
      if (canDamageEntity(healthComponent, "snowball")) {
         const hitDirection = snowball.position.calculateAngleBetween(collidingEntity.position);

         damageEntity(collidingEntity, null, 4, PlayerCauseOfDeath.snowball, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingEntity, 100, hitDirection);
         addLocalInvulnerabilityHash(healthComponent, "snowball", 0.3);
      }
   }
}