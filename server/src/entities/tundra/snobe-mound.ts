import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { SnobeMoundComponent } from "../../components/SnobeMoundComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createSnobeMoundConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 28), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(4);
   
   const snobeMoundComponent = new SnobeMoundComponent();
   
   return {
      entityType: EntityType.snobeMound,
      components: [
         transformComponent,
         healthComponent,
         snobeMoundComponent,
      ],
      lights: []
   }
}