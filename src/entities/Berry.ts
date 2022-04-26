import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderClass, RenderClasses } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import { TileType } from "../tiles";
import { Point, randFloat } from "../utils";

class Berry extends Entity {
   public static spawnableTileTypes = [
      TileType.grass
   ];

   constructor(position: Point) {
      /** Size of the berry in tiles */
      const SIZE = 1;

      const RENDER_CLASSES: RenderClasses = [
         new ImageRenderClass({
            type: "image",
            url: "berry.png",
            size: {
               width: SIZE,
               height: SIZE
            }
         })
      ];

      const STARTING_ROTATION = randFloat(0, 360);

      const HITBOX: CircleHitboxInfo = {
         type: "circle",
         radius: SIZE / 2
      };

      const BERRY_HEALTH = 10;

      super([
         new TransformComponent(position, undefined, STARTING_ROTATION),
         new RenderComponent(RENDER_CLASSES),
         new HitboxComponent(HITBOX),
         new HealthComponent(BERRY_HEALTH)
      ]);
   }
}

export default Berry;