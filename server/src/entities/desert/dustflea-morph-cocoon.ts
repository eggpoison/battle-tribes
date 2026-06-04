import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { EntityConfig } from "../../components.js";
import { DustfleaMorphCocoonComponent } from "../../components/DustfleaMorphCocoonComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";

export function createDustfleaMorphCocoonConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 12), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(4);
   
   const dustfleaMorphCocoonComponent = new DustfleaMorphCocoonComponent();
   
   return {
      entityType: EntityType.dustfleaMorphCocoon,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         dustfleaMorphCocoonComponent,
      ],
      lights: []
   };
}