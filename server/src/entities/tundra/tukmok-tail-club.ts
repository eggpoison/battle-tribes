import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TukmokTailClubComponent } from "../../components/TukmokTailClubComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createTukmokTailClubConfig(position: Point, angle: number, offset: Point): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, offset, angle, 18), 0.28, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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