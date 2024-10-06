import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { SnowballSize, EntityType, PlayerCauseOfDeath, EntityID, SNOWBALL_SIZES } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../components/HealthComponent";
import { SnowballComponent, SnowballComponentArray } from "../components/SnowballComponent";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../components/PhysicsComponent";
import { EntityConfig } from "../components";
import { ServerComponentType } from "battletribes-shared/components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityAgeTicks, getEntityType } from "../world";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { CollisionGroup } from "../../../shared/src/collision-groups";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.snowball;

const DAMAGE_VELOCITY_THRESHOLD = 100;
const MAX_HEALTHS: ReadonlyArray<number> = [1, 3];

export function createSnowballConfig(yeti: EntityID, size: SnowballSize): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, SNOWBALL_SIZES[size] / 2), size === SnowballSize.small ? 1 : 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(MAX_HEALTHS[size]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing);
   
   const snowballComponent = new SnowballComponent(yeti, size);
   
   return {
      entityType: EntityType.snowball,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.snowball]: snowballComponent
      }
   };
}

export function onSnowballCollision(snowball: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.snowball) {
      return;
   }

   // Don't let the snowball damage the yeti which threw it
   if (collidingEntityType === EntityType.yeti) {
      const snowballComponent = SnowballComponentArray.getComponent(snowball);
      if (collidingEntity === snowballComponent.yeti) {
         return;
      }
   }
   
   const transformComponent = TransformComponentArray.getComponent(snowball);
   const physicsComponent = PhysicsComponentArray.getComponent(snowball);

   const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
   const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
   const velocity = Math.sqrt(vx * vx + vy * vy);

   const ageTicks = getEntityAgeTicks(snowball);
   if (velocity < DAMAGE_VELOCITY_THRESHOLD || ageTicks >= 2 * Settings.TPS) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (canDamageEntity(healthComponent, "snowball")) {
         const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
         
         const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

         damageEntity(collidingEntity, null, 4, PlayerCauseOfDeath.snowball, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingEntity, 100, hitDirection);
         addLocalInvulnerabilityHash(healthComponent, "snowball", 0.3);
      }
   }
}