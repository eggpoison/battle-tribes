import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Point } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { GuardianGemQuakeComponent } from "../components/GuardianGemQuakeComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { Hitbox } from "../hitboxes.js";

export function createGuardianGemQuakeConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 10), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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