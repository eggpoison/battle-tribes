import { DEFAULT_COLLISION_MASK, CollisionBit, Entity, EntityType, Settings, StatusEffect, Point, HitboxCollisionType, CircularBox } from "battletribes-shared";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity } from "../../components/HealthComponent.js";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent.js";
import { EntityConfig } from "../../components.js";
import { getEntityType } from "../../world.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { SpitPoisonAreaComponent } from "../../components/SpitPoisonAreaComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createSpitPoisonAreaConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   // @Hack mass
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 55), Number.EPSILON, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const spitPoisonAreaComponent = new SpitPoisonAreaComponent();
   
   return {
      entityType: EntityType.spitPoisonArea,
      components: [
         transformComponent,
         spitPoisonAreaComponent
      ],
      lights: []
   };
}

export function onSpitPoisonCollision(spit: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "spitPoison")) {
      return;
   }

   // @INCOMPLET
   // hitEntity(collidingEntity, spit, 1, DamageSource.poison, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(collidingEntity, "spitPoison", 0.35);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 3 * Settings.TICK_RATE);
   }
}