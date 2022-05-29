import { HealthBarManager } from "../../components/HealthBar";
import InventoryViewerManager from "../../components/inventory/InventoryViewerManager";
import { closeMenu, toggleMenu } from "../../components/menus/MenuManager";
import { togglePlayerRespawnMessage, setPlayerRespawnMessageTime } from "../../components/PlayerRespawnMessage";
import { toggleTribeStashViewerVisibility } from "../../components/TribeStashViewer";
import AttackComponent from "../../entity-components/AttackComponent";
import CameraFollowComponent from "../../entity-components/CameraFollowComponent";
import HealthComponent from "../../entity-components/HealthComponent";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import PlayerControllerComponent from "../../entity-components/PlayerControllerComponent";
import Mouse from "../../Mouse";
import Tribe from "../../Tribe";
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

      super.createEvent("healthChange", () => {
         const health = this.getComponent(HealthComponent)!.getHealth();
         HealthBarManager.setHealth(health);
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
      this.getComponent(AttackComponent)!.startAttack("baseAttack");
   }

   public static isAlive(): boolean {
      if (typeof this.instance === "undefined") return false;

      return this.instance.getComponent(HealthComponent)!.isAlive();
   }

   private onKeyPress(key: string): void {
      switch (key) {
         case "e": {
            // Don't open stuff if dead
            if (!Player.isAlive()) return;

            let isOpeningStash = false;
            const collidingEntities = this.getCollidingEntities();
            for (const entity of collidingEntities) {
               if (entity instanceof TribeStash) {
                  isOpeningStash = true;
                  break;
               }
            }

            if (isOpeningStash) {
               // Open tribe stash viewer
               toggleTribeStashViewerVisibility();
               // Hide any open menus
               closeMenu();
            } else {
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
            } else {
               // Switch to play mode

               Player.currentInteractionMode = PlayerInteractionMode.Play;

               Mouse.deselectUnits();
            }
         }
      }
   }
}

export default Player;