import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randInt } from "battletribes-shared/utils";
import { createEntityFromConfig } from "../../Entity";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { createIceShardConfig } from "../projectiles/ice-shard";
import Layer from "../../Layer";
import { applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { EntityConfig } from "../../components";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { getEntityType } from "../../world";
import { IceSpikesComponent } from "../../components/IceSpikesComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.iceSpikes;

const ICE_SPIKE_RADIUS = 40;

export function createIceSpikesConfig(rootIceSpikes: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, ICE_SPIKE_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionMask = DEFAULT_COLLISION_MASK & ~COLLISION_BITS.iceSpikes;
   
   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing | StatusEffect.bleeding);
   
   const iceSpikesComponent = new IceSpikesComponent(rootIceSpikes);
   
   return {
      entityType: EntityType.iceSpikes,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.iceSpikes]: iceSpikesComponent
      }
   };
}

export function onIceSpikesCollision(iceSpikes: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.yeti || collidingEntityType === EntityType.frozenYeti || collidingEntityType === EntityType.iceSpikes || collidingEntityType === EntityType.snowball) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (canDamageEntity(healthComponent, "ice_spikes")) {
         const transformComponent = TransformComponentArray.getComponent(iceSpikes);
         const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

         const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
         
         damageEntity(collidingEntity, iceSpikes, 1, PlayerCauseOfDeath.ice_spikes, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingEntity, 180, hitDirection);
         addLocalInvulnerabilityHash(healthComponent, "ice_spikes", 0.3);
   
         if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
            applyStatusEffect(collidingEntity, StatusEffect.freezing, 5 * Settings.TPS);
         }
      }
   }
}

export function createIceShardExplosion(layer: Layer, originX: number, originY: number, numProjectiles: number): void {
   for (let i = 0; i < numProjectiles; i++) {
      const moveDirection = 2 * Math.PI * Math.random();
      const x = originX + 10 * Math.sin(moveDirection);
      const y = originY + 10 * Math.cos(moveDirection);
      const position = new Point(x, y);

      const config = createIceShardConfig();
      config.components[ServerComponentType.transform].position.x = position.x;
      config.components[ServerComponentType.transform].position.y = position.y;
      config.components[ServerComponentType.transform].rotation = moveDirection;
      config.components[ServerComponentType.physics].externalVelocity.x += 700 * Math.sin(moveDirection);
      config.components[ServerComponentType.physics].externalVelocity.y += 700 * Math.cos(moveDirection);
      createEntityFromConfig(config, layer, 0);
   }
}