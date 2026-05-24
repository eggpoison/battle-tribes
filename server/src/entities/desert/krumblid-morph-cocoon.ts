import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { KrumblidMorphCocoonComponent } from "../../components/KrumblidMorphCocoonComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";
import Tribe from "../../Tribe.js";

export function createKrumblidMorphCocoonConfig(x: number, y: number, angle: number, tameTribe: Tribe | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 28), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(20);
   
   const krumblidMorphCocoonComponent = new KrumblidMorphCocoonComponent(tameTribe);
   
   return {
      entityType: EntityType.krumblidMorphCocoon,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         krumblidMorphCocoonComponent,
      ],
      lights: []
   };
}