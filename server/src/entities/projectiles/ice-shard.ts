import { CollisionBit, DEFAULT_COLLISION_MASK, EntityType, HitboxCollisionType, createRectangularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { IceShardComponent } from "../../components/IceShardComponent.js";
import { createHitbox } from "../../hitboxes.js";

export function createIceShardConfig(x: number, y: number, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, rotation, 24, 24), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const iceShardComponent = new IceShardComponent();
   
   return {
      entityType: EntityType.iceShardProjectile,
      components: [
         transformComponent,
         iceShardComponent
      ],
      lights: []
   };
}