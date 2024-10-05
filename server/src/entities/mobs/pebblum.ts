import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { PebblumComponent, PebblumComponentArray } from "../../components/PebblumComponent";
import { applyKnockback, PhysicsComponent } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.pebblum;

export function createPebblumConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   
   // Body
   const bodyHitbox = createHitbox(new CircularBox(new Point(0, -4), 0, 10 * 2), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(bodyHitbox, null);
   // Nose
   const noseHitbox = createHitbox(new CircularBox(new Point(0, 6), 0, 8 * 2), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(noseHitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(20);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned);
   
   // @Incomplete?
   const pebblumComponent = new PebblumComponent(0);
   
   return {
      entityType: EntityType.pebblum,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.pebblum]: pebblumComponent
      }
   };
}

export function onPebblumCollision(pebblum: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum);
   if (collidingEntity !== pebblumComponent.targetEntityID) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "pebblum")) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(pebblum);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   
   const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

   // @Incomplete: Cause of death
   damageEntity(collidingEntity, pebblum, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 100, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "pebblum", 0.3);
}