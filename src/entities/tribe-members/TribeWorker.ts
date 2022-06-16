import Board, { Coordinates } from "../../Board";
import Component from "../../Component";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import CustomAI from "../../entity-components/ai/CustomAI";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import InfiniteInventoryComponent from "../../entity-components/inventory/InfiniteInventoryComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import Mouse from "../../Mouse";
import { findPath } from "../../pathfinding";
import Tribe from "../../Tribe";
import { Point } from "../../utils";
import Entity from "../Entity";
import ItemEntity from "../ItemEntity";
import TribeStash from "../TribeStash";
import Tribesman from "./Tribesman";

abstract class TribeWorker extends Tribesman {
   protected abstract readonly mainAIid: string;
   protected abstract readonly speed: number;

   /** The path the user has commanded the unit to follow */
   private commandPath: Array<Coordinates> | null = null;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super(tribe, components);

      this.createEvent("die", () => {
         // Remove any commands the user has put on the user
         this.commandPath = null;

         Mouse.removeSelectedUnit(this);
      });

      this.createCustomAI();
   }

   public onLoad(): void {
      this.getComponent(TransformComponent)!.terminalVelocity = this.speed;
   }

   public commandToTile(targetTileCoordinates: Coordinates): void {
      const aiManagerComponent = this.getComponent(AIManagerComponent)!;

      // Switch to the custom AI
      aiManagerComponent.changeCurrentAI("custom");

      // Calculate a path to the target tile
      const startTile = this.getComponent(TransformComponent)!.getTileCoordinates();
      const path = findPath(startTile, targetTileCoordinates);

      // If the entity has already passed the first tile in the path, then remove it
      const targetTilePosition = new Point((targetTileCoordinates[0] + 0.5) * Board.tileSize, (targetTileCoordinates[1] + 0.5) * Board.tileSize);
      const entityDist = targetTilePosition.distanceFrom(this.getComponent(TransformComponent)!.position);
      const tileDist = targetTilePosition.distanceFrom(new Point((path[0][0] + 0.5) * Board.tileSize, (path[0][1] + 0.5) * Board.tileSize));
      if (entityDist < tileDist) {
         path.splice(0, 1);
      }

      // Start moving to the first tile in the path
      const customAI = aiManagerComponent.getAI("custom");
      customAI.moveToPosition(new Point((path[0][0] + 0.5) * Board.tileSize, (path[0][1] + 0.5) * Board.tileSize), this.speed);
      
      this.commandPath = path;
   }

   public getTargetTile(): Coordinates | null {
      if (this.commandPath === null) return null;

      // Return the final tile in the path
      return this.commandPath[this.commandPath.length - 1];
   }

   private createCustomAI(): void {
      const aiManagerComponent = this.getComponent(AIManagerComponent)!;

      const customAI = aiManagerComponent.addAI(
         new CustomAI("custom")
      );

      customAI.addReachTargetCallback(() => {
         // If the user has commanded the unit to a tile, follow the path to the tile
         if (this.commandPath !== null) {
            this.commandPath.splice(0, 1);

            // If the final tile has been reached, switch back to the normal AI
            if (this.commandPath.length === 0) {
               this.commandPath = null;
               aiManagerComponent.changeCurrentAI(this.mainAIid);
               return;
            }
            
            // Move to the next tile
            const nextTile = this.commandPath[0];
            const targetPosition = new Point((nextTile[0] + 0.5) * Board.tileSize, (nextTile[1] + 0.5) * Board.tileSize);
            customAI.moveToPosition(targetPosition, this.speed);
         }
      });
   }

   public duringCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof ItemEntity) {
         // Pick up the item
         const inventoryComponent = this.getComponent(FiniteInventoryComponent)!;
         inventoryComponent.pickupItemEntity(collidingEntity);
      } else if (collidingEntity instanceof TribeStash) { // Put all items into the stash
         // Don't put items into enemy stashes
         if (collidingEntity.tribe !== this.tribe) return;

         const stashInventoryComponent = collidingEntity.getComponent(InfiniteInventoryComponent)!;
         const thisInventoryComponent = this.getComponent(FiniteInventoryComponent)!;

         const inventory = thisInventoryComponent.getItemSlots();
         for (let slotNum = 0; slotNum < thisInventoryComponent.slotCount; slotNum++) {
            const slot = inventory[slotNum];
            if (typeof slot === "undefined") continue;

            const [currentItemName, currentItemAmount] = slot;

            // Add the item to the item stash and remove it from the tribesman's inventory
            const amountAdded = stashInventoryComponent.addItem(currentItemName, currentItemAmount);
            thisInventoryComponent.removeItemFromSlot(slotNum, amountAdded);
         }
      }
   }
}

export default TribeWorker;