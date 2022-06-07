import { HealthBarManager } from "../../components/HealthBar";
import InventoryViewerManager from "../../components/inventory/InventoryViewerManager";
import { closeMenu, toggleMenu } from "../../components/menus/MenuManager";
import { clearMessage, displayMessage } from "../../components/MessageDisplay";
import { togglePlayerRespawnMessage, setPlayerRespawnMessageTime } from "../../components/PlayerRespawnMessage";
import { toggleTribeStashViewerVisibility, tribeStashViewerIsOpen } from "../../components/TribeStashViewer";
import AttackComponent from "../../entity-components/AttackComponent";
import CameraFollowComponent from "../../entity-components/CameraFollowComponent";
import HealthComponent from "../../entity-components/HealthComponent";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import PlayerControllerComponent from "../../entity-components/PlayerControllerComponent";
import Mouse from "../../Mouse";
import Tribe from "../../Tribe";
import { setWindowFocus } from "../../utils";
import Entity from "../Entity";
import TribeStash from "../TribeStash";
import Chief from "./Chief";

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

      Player.instance = this;
      InventoryViewerManager.getInstance("playerInventory").setInventoryComponent(this.getComponent(FiniteInventoryComponent)!);

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
         InventoryViewerManager.getInstance("playerInventory").setItemSlots(itemSlots);
      });
   }

   protected startRespawn(): void {
      super.startRespawn();

      togglePlayerRespawnMessage(true);
   }

   protected respawn(): void {
      super.respawn();

      togglePlayerRespawnMessage(false);
   }

   protected respawnTick(duration: number): void {
      setPlayerRespawnMessageTime(duration);
   }

   public attack(): void {
      if (Player.currentInteractionMode === PlayerInteractionMode.Play) {
         this.getComponent(AttackComponent)!.attack("baseAttack");
      }
   }

   public static isAlive(): boolean {
      if (typeof this.instance === "undefined") return false;

      return this.instance.getComponent(HealthComponent)!.isAlive();
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
            const collidingEntities = this.getCollidingEntities();
            for (const entity of collidingEntities) {
               if (entity instanceof TribeStash) {
                  isOpeningStash = true;
                  break;
               }
            }

            if (isOpeningStash) {
               // Hide any open menus
               closeMenu();

               // Open tribe stash viewer
               toggleTribeStashViewerVisibility();
            } else {
               // Open the crafting menu
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
            toggleTribeStashViewerVisibility();
         }

         if (Player.currentInteractionMode === PlayerInteractionMode.Play) {
            clearMessage();
         }
      }
   }
}

export default Player;