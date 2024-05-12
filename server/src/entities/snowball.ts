import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { SnowballSize, EntityType, SNOWBALL_SIZES, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import { HealthComponentArray, SnowballComponentArray } from "../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../components/StatusEffectComponent";
import { SnowballComponent } from "../components/SnowballComponent";
import { SERVER } from "../server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../components/PhysicsComponent";
   
const MAX_HEALTHS: ReadonlyArray<number> = [1, 3];

const DAMAGE_VELOCITY_THRESHOLD = 100;

export function createSnowball(position: Point, size: SnowballSize = SnowballSize.small, yetiID: number = 0): Entity {
   const snowball = new Entity(position, EntityType.snowball, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   snowball.rotation = 2 * Math.PI * Math.random();

   const mass = size === SnowballSize.small ? 1 : 1.5;
   const hitbox = new CircularHitbox(snowball.position.x, snowball.position.y, mass, 0, 0, HitboxCollisionType.soft, SNOWBALL_SIZES[size] / 2, snowball.getNextHitboxLocalID(), snowball.rotation);
   snowball.addHitbox(hitbox);

   PhysicsComponentArray.addComponent(snowball.id, new PhysicsComponent(true, false));
   HealthComponentArray.addComponent(snowball.id, new HealthComponent(MAX_HEALTHS[size]));
   StatusEffectComponentArray.addComponent(snowball.id, new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing));
   SnowballComponentArray.addComponent(snowball.id, new SnowballComponent(yetiID, size, Math.floor(randFloat(10, 15) * Settings.TPS)));
   
   return snowball;
}

export function tickSnowball(snowball: Entity): void {
   const snowballComponent = SnowballComponentArray.getComponent(snowball.id);
   
   // Angular velocity
   if (snowballComponent.angularVelocity !== 0) {
      snowball.rotation += snowballComponent.angularVelocity / Settings.TPS;

      const physicsComponent = PhysicsComponentArray.getComponent(snowball.id);
      physicsComponent.hitboxesAreDirty = true;
      
      const beforeSign = Math.sign(snowballComponent.angularVelocity);
      snowballComponent.angularVelocity -= Math.PI / Settings.TPS * beforeSign;
      if (beforeSign !== Math.sign(snowballComponent.angularVelocity)) {
         snowballComponent.angularVelocity = 0;
      }
   }

   if (snowball.ageTicks >= snowballComponent.lifetimeTicks) {
      snowball.remove();
   }
}

export function onSnowballCollision(snowball: Entity, collidingEntity: Entity): void {
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
   
   if (snowball.velocity.length() < DAMAGE_VELOCITY_THRESHOLD || snowball.ageTicks >= 2 * Settings.TPS) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
      if (canDamageEntity(healthComponent, "snowball")) {
         const hitDirection = snowball.position.calculateAngleBetween(collidingEntity.position);

         damageEntity(collidingEntity, 4, null, PlayerCauseOfDeath.snowball, "snowball");
         applyKnockback(collidingEntity, 100, hitDirection);
         SERVER.registerEntityHit({
            entityPositionX: collidingEntity.position.x,
            entityPositionY: collidingEntity.position.y,
            hitEntityID: collidingEntity.id,
            damage: 4,
            knockback: 100,
            angleFromAttacker: hitDirection,
            attackerID: snowball.id,
            flags: 0
         });
         addLocalInvulnerabilityHash(healthComponent, "snowball", 0.3);
      }
   }
}