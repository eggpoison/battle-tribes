import { CollisionBit, DEFAULT_COLLISION_MASK, EntityType, randInt, Box, HitboxCollisionType, createRectangularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { TundraRockFrozenComponent } from "../../components/TundraRockFrozenComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";

const HEALTHS = [15, 35, 55];
const MASSES = [1, 2, 3];

export function createTundraRockFrozenConfig(x: number, y: number, angle: number): EntityConfig {
   const variant = randInt(0, 2);
   
   const transformComponent = new TransformComponent();

   let box: Box;
   switch (variant) {
      case 0: {
         box = createRectangularBox(x, y, 0, 0, angle, 42, 32);
         break;
      }
      case 1: {
         box = createRectangularBox(x, y, 0, 0, angle, 52, 50);
         break;
      }
      default: {
         box = createRectangularBox(x, y, 0, 0, angle, 82, 58);
         break;
      }
   }

   const hitbox = createHitbox(transformComponent, null, box, MASSES[variant], HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(HEALTHS[variant]);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const tundraRockFrozenComponent = new TundraRockFrozenComponent(variant);
   
   return {
      entityType: EntityType.tundraRockFrozen,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         tundraRockFrozenComponent
      ],
      lights: []
   };
}