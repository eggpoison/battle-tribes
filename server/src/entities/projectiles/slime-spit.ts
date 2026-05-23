import { DEFAULT_COLLISION_MASK, CollisionBit, EntityType, Point, HitboxCollisionType, RectangularBox } from "battletribes-shared";
import { SlimeSpitComponent } from "../../components/SlimeSpitComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createSlimeSpitConfig(position: Point, rotation: number, size: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitboxSize = size === 0 ? 20 : 30;
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, hitboxSize, hitboxSize), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const slimeSpitComponent = new SlimeSpitComponent(size);
   
   return {
      entityType: EntityType.slimeSpit,
      components: [
         transformComponent,
         slimeSpitComponent
         ],
      lights: []
   };
}