import { Colour, Point, randFloat, randInt, EntityType, DEFAULT_COLLISION_MASK, CollisionBit, HitboxCollisionType, RectangularBox, TileType } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { LayeredRodComponent } from "../components/LayeredRodComponent.js";
import { Hitbox } from "../hitboxes.js";
   
export function createGrassStrandConfig(position: Point, angle: number, tileType: TileType): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), angle, 4, 4), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   let numLayers: number;
   let colour: Colour;
   if (tileType === TileType.grass) {
      numLayers = randInt(2, 5);
      colour = {
         r: randFloat(0.4, 0.5),
         g: randFloat(0.83, 0.95),
         b: randFloat(0.2, 0.3),
         a: 1
      };
   } else {
      numLayers = randInt(2, 3);
      colour = {
         r: randFloat(229/255, 245/255),
         g: randFloat(212/255, 230/255),
         b: randFloat(137/255, 161/255),
         a: 1
      };
      if (tileType === TileType.sandyDirtDark) {
         colour.r -= 0.085;
         colour.g -= 0.085;
         colour.b -= 0.085;
      }
   }

   const layeredRodComponent = new LayeredRodComponent(numLayers, colour);
   
   return {
      entityType: EntityType.grassStrand,
      components: [
         transformComponent,
         layeredRodComponent
      ],
      lights: []
   };
}