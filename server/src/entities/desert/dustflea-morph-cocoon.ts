import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { DustfleaMorphCocoonComponent } from "../../components/DustfleaMorphCocoonComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createDustfleaMorphCocoonConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 12), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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