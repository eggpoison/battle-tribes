import { ServerComponentType } from "battletribes-shared/components";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { Box, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { TundraRockComponent } from "../../components/TundraRockComponent";
import { EntityConfig } from "../../components";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";

const HEALTHS = [15, 35, 55];
const MASSES = [1, 2, 3];

export function createTundraRockConfig(position: Point, angle: number): EntityConfig {
   const variant = randInt(0, 2);
   
   const transformComponent = new TransformComponent();

   let box: Box;
   switch (variant) {
      case 0: {
         box = new RectangularBox(position, new Point(0, 0), angle, 42, 32);
         break;
      }
      case 1: {
         box = new RectangularBox(position, new Point(0, 0), angle, 52, 50);
         break;
      }
      default: {
         box = new RectangularBox(position, new Point(0, 0), angle, 82, 58);
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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tundraRock]: tundraRockComponent
      },
      lights: []
   };
}