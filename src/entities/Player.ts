import Entity from "../Entity";
import TransformComponent from "../entity-components/TransformComponent";
import PlayerControllerComponent from "../entity-components/PlayerControllerComponent";
import { Point, randFloat } from "../utils";
import Board from "../Board";
import CameraFollowComponent from "../entity-components/CameraFollowComponent";
import RenderComponent, { CircleRenderClass, RenderClasses } from "../entity-components/RenderComponent";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import AttackComponent, { CircleAttack } from "../entity-components/AttackComponent";

class Player extends Entity {
   constructor() {
      const PLAYER_DIAMETER = 1;

      const PLAYER_HITBOX: CircleHitboxInfo = {
         type: "circle",
         radius: PLAYER_DIAMETER / 2
      };
      
      const HAND_SIZE = 0.45;
      const HAND_ANGLES = 40;

      const PLAYER_COLOUR = "#ffcc17";
      const HAND_COLOUR = "#cc9f00";

      const BORDER_COLOUR = "#000";

      const RENDER_CLASSES: RenderClasses = [
         new CircleRenderClass({
            type: "circle",
            fillColour: PLAYER_COLOUR,
            size: {
               radius: PLAYER_DIAMETER / 2
            },
            border: {
               width: 5,
               colour: BORDER_COLOUR
            },
            zIndex: 1
         }),
         new CircleRenderClass({
            type: "circle",
            fillColour: HAND_COLOUR,
            size: {
               radius: HAND_SIZE / 2
            },
            border: {
               width: 3,
               colour: BORDER_COLOUR
            },
            offset: RenderComponent.getOffset(PLAYER_DIAMETER / 2, HAND_ANGLES),
            zIndex: 0
         }),
         new CircleRenderClass({
            type: "circle",
            fillColour: HAND_COLOUR,
            size: {
               radius: HAND_SIZE / 2
            },
            border: {
               width: 3,
               colour: BORDER_COLOUR
            },
            offset: RenderComponent.getOffset(PLAYER_DIAMETER / 2, -HAND_ANGLES),
            zIndex: 0
         })
      ];

      const BASE_ATTACK = new CircleAttack({
         radius: 0.5,
         getPosition: (): Point => {
            return this.getComponent(TransformComponent)!.position;
         },
         damage: 5,
         duration: 0.2
      });

      super([
         new TransformComponent(Player.getStartingPosition()),
         new HitboxComponent(PLAYER_HITBOX),
         new RenderComponent(RENDER_CLASSES),
         new PlayerControllerComponent(),
         new CameraFollowComponent(),
         new AttackComponent(BASE_ATTACK)
      ]);
   }

   private static getStartingPosition(): Point {
      /** % of the board in each direction that the player can't spawn in */
      const PADDING = 5;

      const x = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);
      const y = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);

      return new Point(x, y);
   }
}

export default Player;