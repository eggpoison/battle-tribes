import Entity from "../Entity";
import TransformComponent from "../entity-components/TransformComponent";
import PlayerControllerComponent from "../entity-components/PlayerControllerComponent";
import { Point, randFloat } from "../utils";
import Board from "../Board";
import CameraFollowComponent from "../entity-components/CameraFollowComponent";
import RenderComponent, { CircleRenderClass, RenderClasses } from "../entity-components/RenderComponent";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import AttackComponent, { CircleAttack } from "../entity-components/AttackComponent";
import Resource from "./Resource";
import InventoryComponent from "../entity-components/InventoryComponent";

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

      super([
         new TransformComponent(Player.getStartingPosition()),
         new HitboxComponent(PLAYER_HITBOX),
         new RenderComponent(RENDER_CLASSES),
         new PlayerControllerComponent(),
         new CameraFollowComponent(),
         new AttackComponent(),
         new InventoryComponent()
      ]);

      /** The distance away from the player (in tiles) that the attack is performed */
      const ATTACK_OFFSET = 0.5;

      const attackComponent = this.getComponent(AttackComponent)!;

      attackComponent.addAttack("baseAttack", new CircleAttack({
         radius: 1.5,
         getPosition: (): Point => {
            const rotation = this.getComponent(TransformComponent)!.rotation;

            const offset = RenderComponent.getOffset(PLAYER_DIAMETER / 2 + ATTACK_OFFSET, rotation);
            const offsetPoint = new Point(offset[0], offset[1]);

            return this.getComponent(TransformComponent)!.position.add(offsetPoint);
         },
         damage: 5,
         duration: 0.2,
         attackingEntity: this
      }));
   }

   private static getStartingPosition(): Point {
      /** % of the board in each direction that the player can't spawn in */
      const PADDING = 5;

      const x = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);
      const y = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);

      return new Point(x, y);
   }

   public onCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof Resource) {
         // Pick up the resource
         const inventoryComponent = this.getComponent(InventoryComponent)!;
         inventoryComponent.pickupResource(collidingEntity);
      }
   }
}

export default Player;