import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { DustfleaEggComponent } from "../../components/DustfleaEggComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createDustfleaEggConfig(x: number, y: number, angle: number, parentOkren: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 12), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(5);

   const dustfleaEggComponent = new DustfleaEggComponent(parentOkren);
   
   return {
      entityType: EntityType.dustfleaEgg,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         dustfleaEggComponent
      ],
      lights: []
   };
}