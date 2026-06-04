import { HealthComponent } from "../components/HealthComponent.js";
import { SnowballComponent } from "../components/SnowballComponent.js";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { StatusEffectComponent } from "../components/StatusEffectComponent.js";
import { addHitboxAngularVelocity, createHitbox } from "../hitboxes.js";
import { createCircularBox, HitboxCollisionType } from "../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../shared/dist/entities.js";
import { StatusEffect } from "../../../shared/dist/status-effects.js";
import { randFloat, randSign } from "../../../shared/dist/utils.js";

const MAX_HEALTHS: ReadonlyArray<number> = [1, 3, 5, 7];

export function createSnowballConfig(x: number, y: number, angle: number, yeti: Entity, size: number): EntityConfig {
   const transformComponent = new TransformComponent();

   let radius: number;
   switch (size) {
      case 0: radius = 8; break;
      case 1: radius = 14; break;
      case 2: radius = 22; break;
      case 3: radius = 30; break;
      default: throw new Error();
   }
   const mass = radius * radius * 0.003;
   
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, radius), mass, HitboxCollisionType.soft, CollisionBit.snowball, DEFAULT_COLLISION_MASK);
   addHitboxAngularVelocity(hitbox, randFloat(1, 2) * Math.PI * randSign());
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(MAX_HEALTHS[size]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing);
   
   const snowballComponent = new SnowballComponent(yeti, size);
   
   return {
      entityType: EntityType.snowball,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         snowballComponent
      ],
      lights: []
   };
}