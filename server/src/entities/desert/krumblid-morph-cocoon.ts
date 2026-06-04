import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { KrumblidMorphCocoonComponent } from "../../components/KrumblidMorphCocoonComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import Tribe from "../../Tribe.js";

export function createKrumblidMorphCocoonConfig(x: number, y: number, angle: number, tameTribe: Tribe | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 28), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
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