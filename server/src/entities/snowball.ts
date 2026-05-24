import { DEFAULT_COLLISION_MASK, CollisionBit, EntityType, Entity, StatusEffect, Point, randFloat, randSign, HitboxCollisionType, CircularBox } from "battletribes-shared";
import { HealthComponent } from "../components/HealthComponent.js";
import { SnowballComponent } from "../components/SnowballComponent.js";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { StatusEffectComponent } from "../components/StatusEffectComponent.js";
import { addHitboxAngularVelocity, Hitbox } from "../hitboxes.js";

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
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, radius), mass, HitboxCollisionType.soft, CollisionBit.snowball, DEFAULT_COLLISION_MASK, []);
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