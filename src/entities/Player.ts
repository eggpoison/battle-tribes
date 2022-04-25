import Entity from "../Entity";
import TransformComponent from "../entity-components/TransformComponent";
import PlayerControllerComponent from "../entity-components/PlayerControllerComponent";
import { Point, randFloat } from "../utils";
import Board from "../Board";
import CameraFollowComponent from "../entity-components/CameraFollowComponent";
import RenderComponent, { RenderSettings } from "../entity-components/RenderComponent";

class Player extends Entity {
   constructor() {
      /** Number of cells that the player takes up */
      const PLAYER_SIZE = 1;

      const RENDER_SETTINGS: RenderSettings = {
         type: "circle",
         fillColour: "red",
         border: {
            width: 4,
            colour: "#000"
         }
      };

      super([
         new TransformComponent(Player.getStartingPosition(), PLAYER_SIZE, PLAYER_SIZE),
         new RenderComponent(RENDER_SETTINGS),
         new PlayerControllerComponent(),
         new CameraFollowComponent()
      ]);
   }

   private static getStartingPosition(): Point {
      /** % of the board in each direction that the player can't spawn in */
      const PADDING = 5;

      const x = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);
      const y = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);

      return new Point(x, y);
   }

   private static render(ctx: CanvasRenderingContext2D): void {

   }
}

export default Player;