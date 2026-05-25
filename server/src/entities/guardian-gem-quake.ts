import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { GuardianGemQuakeComponent } from "../components/GuardianGemQuakeComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { createHitbox, setHitboxIsStatic } from "../hitboxes.js";

export function createGuardianGemQuakeConfig(x: number, y: number, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, rotation, 10), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const guardianGemQuakeComponent = new GuardianGemQuakeComponent();
   
   return {
      entityType: EntityType.guardianGemQuake,
      components: [
         transformComponent,
         guardianGemQuakeComponent
      ],
      lights: []
   };
}