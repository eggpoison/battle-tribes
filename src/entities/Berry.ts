import Entity from "../Entity";
import RenderComponent, { RenderSettings } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import { TileType } from "../tiles";
import { Point } from "../utils";

class Berry extends Entity {
   public static spawnableTileTypes = [
      TileType.grass
   ];

   constructor(position: Point) {
      /** Size of the berry in tiles */
      const SIZE = 1;

      const RENDER_SETTINGS: RenderSettings = {
         type: "image",
         url: "berry.png"
      };

      super([
         new TransformComponent(position, SIZE, SIZE),
         new RenderComponent(RENDER_SETTINGS)
      ]);
   }
}

export default Berry;