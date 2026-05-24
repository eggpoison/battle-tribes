import { CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Point, randInt, Box, HitboxCollisionType, RectangularBox } from "battletribes-shared";
import { TundraRockComponent } from "../../components/TundraRockComponent.js";
import { EntityConfig } from "../../components.js";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";

const HEALTHS = [15, 35, 55];
const MASSES = [1, 2, 3];

export function createTundraRockConfig(x: number, y: number, angle: number): EntityConfig {
   const variant = randInt(0, 2);
   
   const transformComponent = new TransformComponent();

   let box: Box;
   switch (variant) {
      case 0: {
         box = new RectangularBox(x, y, 0, 0, angle, 42, 32);
         break;
      }
      case 1: {
         box = new RectangularBox(x, y, 0, 0, angle, 52, 50);
         break;
      }
      default: {
         box = new RectangularBox(x, y, 0, 0, angle, 82, 58);
         break;
      }
   }

   const hitbox = new Hitbox(transformComponent, null, true, box, MASSES[variant], HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(HEALTHS[variant]);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const tundraRockComponent = new TundraRockComponent(variant);
   
   return {
      entityType: EntityType.tundraRock,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         tundraRockComponent
      ],
      lights: []
   };
}