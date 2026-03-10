import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../../world";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { SpitPoisonAreaComponent } from "../../components/SpitPoisonAreaComponent";
import { Hitbox } from "../../hitboxes";

export function createSpitPoisonAreaConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   // @Hack mass
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 55), Number.EPSILON, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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