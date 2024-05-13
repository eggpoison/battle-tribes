import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { HealthComponentArray, IceShardComponentArray, PlantComponentArray } from "../../components/ComponentArray";
import { addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { SERVER } from "../../server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { EntityCreationInfo } from "../../entity-components";

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.iceShard];

export function createIceShard(position: Point, rotation: number): EntityCreationInfo<ComponentTypes> {
   const iceShard = new Entity(position, rotation, EntityType.iceShardProjectile, COLLISION_BITS.default, DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox);

   const hitbox = new RectangularHitbox(iceShard.position.x, iceShard.position.y, 0.4, 0, 0, HitboxCollisionType.soft, iceShard.getNextHitboxLocalID(), iceShard.rotation, 24, 24, 0);
   iceShard.addHitbox(hitbox);
   
   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, false);
   PhysicsComponentArray.addComponent(iceShard.id, physicsComponent);
   
   const iceShardComponent = {
      lifetime: randFloat(0.1, 0.2)
   };
   IceShardComponentArray.addComponent(iceShard.id, iceShardComponent);

   return {
      entity: iceShard,
      components: {
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.iceShard]: iceShardComponent
      }
   };
}

export function tickIceShard(iceShard: Entity): void {
   // @Cleanup @Speed: Don't even need a component for this, just do it based on age with a random chance
   const iceShardComponent = IceShardComponentArray.getComponent(iceShard.id);
   if (iceShard.ageTicks / Settings.TPS >= iceShardComponent.lifetime) {
      iceShard.destroy();
   }
}

const entityIsIceSpikes = (entity: Entity): boolean => {
   switch (entity.type) {
      case EntityType.iceSpikes: {
         return true;
      }
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity.id);
         return plantComponent.plantType === PlanterBoxPlant.iceSpikes;
      }
      default: {
         return false;
      }
   }
}

export function onIceShardCollision(iceShard: Entity, collidingEntity: Entity): void {
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   // Shatter the ice spike
   iceShard.destroy();

   if (entityIsIceSpikes(collidingEntity)) {
      // Instantly destroy ice spikes
      damageEntity(collidingEntity, 99999, null, PlayerCauseOfDeath.ice_spikes);
   } else {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
      if (!canDamageEntity(healthComponent, "ice_shards")) {
         return;
      }
      
      const hitDirection = iceShard.position.calculateAngleBetween(collidingEntity.position);

      damageEntity(collidingEntity, 2, null, PlayerCauseOfDeath.ice_shards, "ice_shards");
      applyKnockback(collidingEntity, 150, hitDirection);
      SERVER.registerEntityHit({
         entityPositionX: collidingEntity.position.x,
         entityPositionY: collidingEntity.position.y,
         hitEntityID: collidingEntity.id,
         damage: 2,
         knockback: 150,
         angleFromAttacker: hitDirection,
         attackerID: iceShard.id,
         flags: 0
      });
      addLocalInvulnerabilityHash(healthComponent, "ice_shards", 0.3);

      if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
         applyStatusEffect(collidingEntity.id, StatusEffect.freezing, 3 * Settings.TPS);
      }
   }
}