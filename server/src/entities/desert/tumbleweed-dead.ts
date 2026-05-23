import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect, Point, randFloat } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TumbleweedDeadComponent } from "../../components/TumbleweedDeadComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createTumbleweedDeadConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 40), randFloat(0.19, 0.23), HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(2);
   
   const tumbleweedDeadComponent = new TumbleweedDeadComponent();
   
   return {
      entityType: EntityType.tumbleweedDead,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         tumbleweedDeadComponent
      ],
      lights: []
   };
}