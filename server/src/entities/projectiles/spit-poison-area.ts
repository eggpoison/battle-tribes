import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../../world";
import { TransformComponent } from "../../components/TransformComponent";
import { SpitPoisonAreaComponent } from "../../components/SpitPoisonAreaComponent";
import { CollisionGroup } from "battletribes-shared/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.spitPoisonArea;

const RADIUS = 55;

export function createSpitPoisonAreaConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.exclusiveDamaging);
   // @Hack mass
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, RADIUS), Number.EPSILON, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const spitPoisonAreaComponent = new SpitPoisonAreaComponent();
   
   return {
      entityType: EntityType.spitPoisonArea,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.spitPoisonArea]: spitPoisonAreaComponent
      }
   }
}

export function onSpitPoisonCollision(spit: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "spitPoison")) {
      return;
   }

   damageEntity(collidingEntity, spit, 1, PlayerCauseOfDeath.poison, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(healthComponent, "spitPoison", 0.35);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 3 * Settings.TPS);
   }
}