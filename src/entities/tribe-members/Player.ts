import { HealthBarManager } from "../../components/HealthBar";
import { closeMenu, toggleMenu } from "../../components/menus/MenuManager";
import { clearMessage, displayMessage } from "../../components/MessageDisplay";
import { updatePlayerInventoryViewer, updatePlayerInventoryViewerSelectedSlot } from "../../components/inventory/PlayerInventoryViewer";
import { togglePlayerRespawnMessage, setPlayerRespawnMessageTime } from "../../components/PlayerRespawnMessage";
import { toggleTribeStashViewerVisibility, tribeStashViewerIsOpen } from "../../components/inventory/TribeStashViewer";
import AttackComponent from "../../entity-components/AttackComponent";
import CameraFollowComponent from "../../entity-components/CameraFollowComponent";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import PlayerControllerComponent from "../../entity-components/PlayerControllerComponent";
import Mouse from "../../Mouse";
import Tribe from "../../Tribe";
import { setWindowFocus } from "../../utils";
import Entity from "../Entity";
import TribeStash from "../TribeStash";
import Chief from "./Chief";
import SelectedSlotComponent from "../../entity-components/SelectedSlotComponent";
import InfiniteInventoryComponent from "../../entity-components/inventory/InfiniteInventoryComponent";
import { updateOpenedInventoryComponent } from "../../components/inventory/ItemSlot";
import ITEMS, { ItemName } from "../../items/items";
import ToolItem from "../../items/ToolItem";

const showGUIS = (): void => {
   document.getElementById("health-bar")!.classList.remove("hidden");
   document.getElementById("inventory-viewer")!.classList.remove("hidden");
   document.getElementById("xp-bar")!.classList.remove("hidden");
}

const hideGUIs = (): void => {
   document.getElementById("health-bar")!.classList.add("hidden");
   document.getElementById("inventory-viewer")!.classList.add("hidden");
   document.getElementById("xp-bar")!.classList.add("hidden");
}

export enum PlayerInteractionMode {
   Play,
   SelectUnits
}

class Player extends Chief {
   public static instance: Player;

   public static currentInteractionMode: PlayerInteractionMode = PlayerInteractionMode.Play;

   constructor(tribe: Tribe) {
      super(tribe, [
         new PlayerControllerComponent(),
         new CameraFollowComponent()
      ]);

      // If an instance of the player has already been created, throw an error
      if (typeof Player.instance !== "undefined") {
         throw new Error("A player instance already exists!");
      }

      Player.instance = this;

      PlayerControllerComponent.createKeyEvent((key: string) => this.onKeyPress(key));

      this.createEvent("healthChange", () => {
         const health = this.getComponent(HealthComponent)!.getHealth();
         HealthBarManager.setHealth(health);
      });

      this.createEvent("die", () => {
         // Hide any open menus
         closeMenu();
      });

      this.createEvent("inventoryChange", () => {
         // Update inventory viewer
         const itemSlots = this.getComponent(FiniteInventoryComponent)!.getItemSlots();
         updatePlayerInventoryViewer(itemSlots);
      }); 

      this.getComponent(FiniteInventoryComponent)!.addItem(ItemName.woodenPickaxe, 1);
      this.getComponent(FiniteInventoryComponent)!.addItem(ItemName.wood, 16);
   }

   protected startRespawn(): void {
      super.startRespawn();

      hideGUIs();

      togglePlayerRespawnMessage(true);
   }

   protected respawn(): void {
      super.respawn();

      showGUIS();

      togglePlayerRespawnMessage(false);
   }

   protected respawnTick(duration: number): void {
      setPlayerRespawnMessageTime(duration);
   }

   public startLeftClick(): void {
      if (!Player.isAlive()) return;

      // Attack
      const heldItemName = this.getComponent(SelectedSlotComponent)!.getSelectedItemName();
      if (heldItemName === null || !(ITEMS[heldItemName] instanceof ToolItem)) {
         this.getComponent(AttackComponent)!.attack("baseAttack");
      } else {
         this.getComponent(SelectedSlotComponent)!.startLeftClick();
      }
   }

   public endLeftClick(): void {
      this.getComponent(SelectedSlotComponent)!.endLeftClick();
   }

   public startRightClick(): void {
      this.getComponent(SelectedSlotComponent)!.startRightClick();
   }

   public endRightClick(): void {
      this.getComponent(SelectedSlotComponent)!.endRightClick();
   }

   public rightClick(): void {

   }

   public static isAlive(): boolean {
      if (typeof this.instance === "undefined") return false;

      return this.instance.getComponent(HealthComponent)!.isAlive();
   }

   private changeSelectedSlot(newSelectedSlot: number): void {
      // Don't select the slot if it's out of bounds
      const slotCount = this.getComponent(FiniteInventoryComponent)!.slotCount;
      if (newSelectedSlot >= slotCount) return;

      this.getComponent(SelectedSlotComponent)!.changeSlot(newSelectedSlot);

      updatePlayerInventoryViewerSelectedSlot(newSelectedSlot);
   }

   private onKeyPress(key: string): void {
      setWindowFocus(true);

      switch (key) {
         case "e": {
            // Don't open stuff if dead
            if (!Player.isAlive()) return;

            // Don't open stuff if in unit selection mode
            if (Player.currentInteractionMode === PlayerInteractionMode.SelectUnits) return;

            let isOpeningStash = false;
            const collidingEntities = this.getComponent(HitboxComponent)!.getCollidingEntities();
            for (const entity of collidingEntities) {
               if (entity instanceof TribeStash) {
                  isOpeningStash = true;
                  break;
               }
            }

            if (isOpeningStash) {
               // Hide any open menus
               closeMenu();

               // Toggle the stash viewer
               this.toggleTribeStash();
            } else {
               // Toggle the crafting menu
               toggleMenu("crafting");
            }

            Chief.isOpeningStash = isOpeningStash;

            break;
         }

         case " ": {
            // Switch interaction mode
            if (Player.currentInteractionMode === PlayerInteractionMode.Play) {
               // Switch to unit selection mode

               Player.currentInteractionMode = PlayerInteractionMode.SelectUnits;

               displayMessage("(Press space to exit unit selection mode)");
               
               document.getElementById("unit-selection-mode-border")!.classList.remove("hidden");
            } else {
               // Switch to play mode

               Player.currentInteractionMode = PlayerInteractionMode.Play;

               Mouse.deselectUnits();

               clearMessage();

               document.getElementById("unit-selection-mode-border")!.classList.add("hidden");
            }

            break;
         }

         case "Escape": {
            Mouse.deselectUnits();

            break;
         }

         case "1": { this.changeSelectedSlot(0); break; }
         case "2": { this.changeSelectedSlot(1); break; }
         case "3": { this.changeSelectedSlot(2); break; }
         case "4": { this.changeSelectedSlot(3); break; }
         case "5": { this.changeSelectedSlot(4); break; }
         case "6": { this.changeSelectedSlot(5); break; }
         case "7": { this.changeSelectedSlot(6); break; }
         case "8": { this.changeSelectedSlot(7); break; }
         case "9": { this.changeSelectedSlot(8); break; }
      }
   }

   public onCollision(collidingEntity: Entity): void {
      super.onCollision(collidingEntity);

      if (collidingEntity instanceof TribeStash) {
         // If the stash is belongs to the player's tribe, display the open message
         if (collidingEntity.tribe === this.tribe && Player.currentInteractionMode === PlayerInteractionMode.Play) {
            displayMessage(TribeStash.OPEN_MESSAGE);
         }
      }
   }

   public onLeaveCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof TribeStash) {
         // Hide the stash viewer
         if (tribeStashViewerIsOpen()) {
            this.toggleTribeStash(false);
         }

         if (Player.currentInteractionMode === PlayerInteractionMode.Play) {
            clearMessage();
         }
      }
   }

   private toggleTribeStash(newVisibility?: boolean): void {
      const isVisible = tribeStashViewerIsOpen();

      if (!isVisible) {
         displayMessage(TribeStash.CLOSE_MESSAGE);
         updateOpenedInventoryComponent(Player.instance.tribe.stash.getComponent(InfiniteInventoryComponent));
      } else {
         displayMessage(TribeStash.OPEN_MESSAGE);
         updateOpenedInventoryComponent(null);
      }

      toggleTribeStashViewerVisibility(newVisibility);
   }
}

export default Player;