import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TukmokTailClubComponent } from "../../components/TukmokTailClubComponent.js";
import { createHitbox } from "../../hitboxes.js";

export function createTukmokTailClubConfig(x: number, y: number, angle: number, offsetX: number, offsetY: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, offsetX, offsetY, angle, 18), 0.28, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(75);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const tukmokTailComponent = new TukmokTailClubComponent();
   
   return {
      entityType: EntityType.tukmokTailClub,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         tukmokTailComponent
      ],
      lights: []
   };
}