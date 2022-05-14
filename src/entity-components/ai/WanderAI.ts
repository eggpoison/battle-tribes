import Board from "../../Board";
import SETTINGS from "../../settings";
import { Point, randItem } from "../../utils";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

class WanderAI extends EntityAI {
   /** Chance for the entity to wander each second */
   protected readonly wanderChance: number | null;
   protected readonly wanderRange: number;
   protected readonly wanderSpeed: number;

   constructor(wanderChance: number | null, wanderRange: number, wanderSpeed: number) {
      super("wander");

      this.wanderChance = wanderChance;
      this.wanderRange = wanderRange;
      this.wanderSpeed = wanderSpeed;
   }

   protected getWanderTarget(): Point {
      const position = this.entity.getComponent(TransformComponent)!.position;

      // Get all nearby tiles
      let nearbyTileCoordinates = Board.getNearbyTileCoordinates(position, this.wanderRange);

      // Remove tiles which the entity can't move to
      if (typeof this.entity.entityInfo !== "undefined") {
         for (let i = nearbyTileCoordinates.length - 1; i >= 0; i--) {
            const tileCoordinates = nearbyTileCoordinates[i];
            const tileType = Board.getTileType(...tileCoordinates);

            // Remove the tile if it can't be moved to
            const preferredTileTypes = this.entity.entityInfo.spawnRequirements.tileTypes;
            if (typeof preferredTileTypes === "undefined" || !preferredTileTypes.includes(tileType)) {
               nearbyTileCoordinates.splice(i, 1);
            }
         }
      }

      // If there are no eligible tiles, return a random position in the current tile
      if (nearbyTileCoordinates.length === 0) {
         const x = Math.floor(position.x / Board.tileSize);
         const y = Math.floor(position.y / Board.tileSize);

         const targetPosition = Board.getRandomPositionInTile([x, y]);
         return targetPosition;
      }

      // Choose a random nearby tile from the list of nearby tiles
      const targetTileCoordinates = randItem(nearbyTileCoordinates);

      // Move to a random position in the chosen tile
      const targetPosition = Board.getRandomPositionInTile(targetTileCoordinates);
      return targetPosition;
   }

   public tick(): void {
      super.checkTargetPosition();

      if (Math.random() < this.wanderChance! / SETTINGS.tps) {
         const targetPosition = this.getWanderTarget();
         super.moveToPosition(targetPosition, this.wanderSpeed);
      }
   }
}

export default WanderAI;