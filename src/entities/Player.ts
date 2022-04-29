import Entity from "../Entity";
import TransformComponent from "../entity-components/TransformComponent";
import PlayerControllerComponent from "../entity-components/PlayerControllerComponent";
import { getRandomAngle, Point, Vector } from "../utils";
import CameraFollowComponent from "../entity-components/CameraFollowComponent";
import RenderComponent, { EllipseRenderClass, RenderClasses } from "../entity-components/RenderComponent";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import AttackComponent, { CircleAttack } from "../entity-components/AttackComponent";
import Resource from "./Resource";
import InventoryComponent from "../entity-components/InventoryComponent";
import TribeStash from "./TribeStash";
import Tribe from "../Tribe";
import Board from "../Board";
import { hideMessageDisplay, setMessageDisplay } from "../components/MessageDisplay";
import InventoryViewerManager from "../components/InventoryViewerManager";
import { toggleTribeStashViewerVisibility } from "../components/TribeStashViewer";

class Player extends Entity {
   public static instance: Player;
   public static tribe: Tribe;

   public static readonly DEFAULT_INVENTORY_SLOT_COUNT = 2;

   constructor(tribe: Tribe) {
      /** How far away the player spawns from their stash */
      const OFFSET = 2;
      const offsetPoint = new Vector(OFFSET * Board.tileSize, getRandomAngle()).convertToPoint();
      const spawnPosition = tribe.position.add(offsetPoint);
      
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
         new EllipseRenderClass({
            type: "ellipse",
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
         new EllipseRenderClass({
            type: "ellipse",
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
         new EllipseRenderClass({
            type: "ellipse",
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
         new TransformComponent(spawnPosition),
         new HitboxComponent(PLAYER_HITBOX),
         new RenderComponent(RENDER_CLASSES),
         new PlayerControllerComponent(),
         new CameraFollowComponent(),
         new AttackComponent(),
         new InventoryComponent(Player.DEFAULT_INVENTORY_SLOT_COUNT)
      ]);

      Player.tribe = tribe;
      Player.instance = this;

      InventoryViewerManager.getInstance("playerInventory").setInventoryComponent(this.getComponent(InventoryComponent)!);

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
         damage: 2,
         duration: 0.2,
         attackingEntity: this
      }));

      PlayerControllerComponent.createKeyEvent((key: string) => this.onKeyPress(key));
   }

   protected onCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof Resource) {
         // Pick up the resource
         const inventoryComponent = this.getComponent(InventoryComponent)!;
         inventoryComponent.pickupResource(collidingEntity);

         // Update the player inventory viewer
         const inventory = inventoryComponent.getItemSlots();
         InventoryViewerManager.getInstance("playerInventory").setInventory(inventory);
      } else if (collidingEntity instanceof TribeStash) {
         // Do nothing if it belongs to a different tribe.
         if (Player.tribe !== collidingEntity.tribe) return;

         setMessageDisplay(TribeStash.OPEN_MESSAGE);
      }
   }

   protected onLeaveCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof TribeStash) {
         hideMessageDisplay();
      }
   }

   private onKeyPress(key: string): void {
      if (key === " ") {
         const collidingEntities = this.getCollidingEntities();

         for (const entity of collidingEntities) {
            if (entity instanceof TribeStash) {
               // Open tribe stash viewer
               toggleTribeStashViewerVisibility();
               break;
            }
         }
      }
   }
}

export default Player;