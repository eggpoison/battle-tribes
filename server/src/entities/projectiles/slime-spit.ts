import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { SlimeSpitComponent, SlimeSpitComponentArray } from "../../components/SlimeSpitComponent";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { applyKnockback, PhysicsComponent } from "../../components/PhysicsComponent";
import { EntityConfig } from "../../components";
import { ServerComponentType } from "battletribes-shared/components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { createSpitPoisonAreaConfig } from "./spit-poison-area";
import { createEntityFromConfig } from "../../Entity";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity, getEntityLayer, getEntityType } from "../../world";
import { CollisionGroup } from "battletribes-shared/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.slimeSpit;

const HITBOX_SIZES = [20, 30];

export function createSlimeSpitConfig(size: number): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitboxSize = HITBOX_SIZES[size];
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), hitboxSize, hitboxSize, 0), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const slimeSpitComponent = new SlimeSpitComponent(size);
   
   return {
      entityType: EntityType.slimeSpit,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.slimeSpit]: slimeSpitComponent
      }
   };
}

export function onSlimeSpitCollision(spit: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(spit);
   const spitComponent = SlimeSpitComponentArray.getComponent(spit);

   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

   const damage = spitComponent.size === 0 ? 2 : 3;
   const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

   damageEntity(collidingEntity, spit, damage, PlayerCauseOfDeath.poison, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 150, hitDirection);
   
   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TPS);
   }

   destroyEntity(spit);
}

export function onSlimeSpitDeath(spit: EntityID): void {
   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   if (spitComponent.size === 1) {
      const transformComponent = TransformComponentArray.getComponent(spit);

      const config = createSpitPoisonAreaConfig();
      config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
      config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
      config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntityFromConfig(config, getEntityLayer(spit), 0);
   }
}