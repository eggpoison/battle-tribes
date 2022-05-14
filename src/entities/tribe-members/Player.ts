import Entity, { EventType } from "../Entity";
import TransformComponent from "../../entity-components/TransformComponent";
import PlayerControllerComponent from "../../entity-components/PlayerControllerComponent";
import { Point } from "../../utils";
import CameraFollowComponent from "../../entity-components/CameraFollowComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import AttackComponent, { CircleAttack } from "../../entity-components/AttackComponent";
import ItemEntity from "../ItemEntity";
import TribeStash from "../TribeStash";
import Tribe from "../../Tribe";
import Board from "../../Board";
import { hideMessageDisplay, setMessageDisplay } from "../../components/MessageDisplay";
import InventoryViewerManager from "../../components/inventory/InventoryViewerManager";
import { toggleTribeStashViewerVisibility } from "../../components/TribeStashViewer";
import HealthComponent from "../../entity-components/HealthComponent";
import { HealthBarManager } from "../../components/HealthBar";
import TribeMemberComponent from "../../entity-components/TribeMemberComponent";
import GenericTribeMember from "./GenericTribeMember";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";

class Player extends GenericTribeMember {
   public readonly SIZE = 1;

   public static readonly SPEED = 5;
   public static readonly HEALTH = 20;
   public static readonly TRIBE_COLOUR = "#ffcc17";

   public static instance: Player;

   public static readonly DEFAULT_INVENTORY_SLOT_COUNT = 3;

   constructor(tribe: Tribe) {
      const HAND_SIZE = 0.45;
      const HAND_ANGLES = 40 / 180 * Math.PI;

      const HAND_COLOUR = "#cc9f00";

      super(tribe, [
         new PlayerControllerComponent(),
         new CameraFollowComponent(),
         new AttackComponent(),
         new FiniteInventoryComponent(Player.DEFAULT_INVENTORY_SLOT_COUNT),
         new TribeMemberComponent(tribe)
      ]);

      this.getComponent(HealthComponent)!.setMaxHealth(Player.HEALTH, true);

      this.setHitbox();

      super.createRenderParts(this.SIZE, HAND_SIZE, Player.TRIBE_COLOUR, HAND_COLOUR, HAND_ANGLES);

      Player.instance = this;

      InventoryViewerManager.getInstance("playerInventory").setInventoryComponent(this.getComponent(FiniteInventoryComponent)!);

      /** The distance away from the player (in tiles) that the attack is performed */
      const ATTACK_OFFSET = 0.5;

      const attackComponent = this.getComponent(AttackComponent)!;

      attackComponent.addAttack("baseAttack", new CircleAttack({
         radius: 1,
         getPosition: (): Point => {
            const rotation = this.getComponent(TransformComponent)!.rotation;

            const offset = RenderComponent.getOffset((this.SIZE / 2 + ATTACK_OFFSET) * Board.tileSize, rotation);
            const offsetPoint = new Point(offset[0], offset[1]);

            return this.getComponent(TransformComponent)!.position.add(offsetPoint);
         },
         damage: 2,
         knockbackStrength: 3,
         attackingEntity: this
      }));

      PlayerControllerComponent.createKeyEvent((key: string) => this.onKeyPress(key));

      super.createEvent(EventType.hurt, () => {
         const health = this.getComponent(HealthComponent)!.getHealth();
         HealthBarManager.setHealth(health);
      });

      // Reveal the space the player is standing in
      const position = this.getComponent(TransformComponent)!.position;
      Board.revealFog(position, this.SIZE / 2 * Board.tileSize, true);
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }

   protected onCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof ItemEntity) {
         // Pick up the item
         const inventoryComponent = this.getComponent(FiniteInventoryComponent)!;
         inventoryComponent.pickupResource(collidingEntity);

         // Update the player inventory viewer
         const itemSlots = inventoryComponent.getItemSlots();
         InventoryViewerManager.getInstance("playerInventory").setItemSlots(itemSlots);
      } else if (collidingEntity instanceof TribeStash) {
         // Do nothing if it belongs to a different tribe.
         const playerTribe = this.getComponent(TribeMemberComponent)!.tribe;
         const stashTribe = collidingEntity.getComponent(TribeMemberComponent)!.tribe;
         if (playerTribe !== stashTribe) return;

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