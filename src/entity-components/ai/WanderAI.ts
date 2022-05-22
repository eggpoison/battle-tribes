import Board from "../../Board";
import SETTINGS from "../../settings";
import { Point, randItem } from "../../utils";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

type WanderAIInfo = {
   readonly range: number;
   readonly speed: number;
   /** The average number of times that the entity will wander in a second */
   readonly wanderRate: number;
}

class WanderAI extends EntityAI {
   public readonly id: string;

   /** Chance for the entity to wander each second */
   protected readonly wanderChance: number;
   protected readonly range: number;
   protected readonly speed: number;

   constructor(id: string, info: WanderAIInfo) {
      super();

      this.id = id;

      this.range = info.range;
      this.speed = info.speed;
      this.wanderChance = info.wanderRate;
   }

   protected getRandomTargetPosition(): Point {
      const position = this.entity.getComponent(TransformComponent)!.position;

      // Get all nearby tiles
      let nearbyTileCoordinates = Board.getNearbyTileCoordinates(position, this.range);

      // Remove tiles which the entity can't move to
      if (typeof this.entity.entityInfo !== "undefined") {
         for (let i = nearbyTileCoordinates.length - 1; i >= 0; i--) {
            const tileCoordinates = nearbyTileCoordinates[i];
            const tile = Board.getTile(...tileCoordinates);

            // Remove the tile if it can't be moved to
            const preferredTileTypes = this.entity.entityInfo.spawnRequirements.tileTypes;
            if (typeof preferredTileTypes === "undefined" || !preferredTileTypes.includes(tile.kind)) {
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
      super.tick();

      super.checkTargetPosition();

      // Wander randomly
      if (Math.random() < this.wanderChance / SETTINGS.tps) {
         const targetPosition = this.getRandomTargetPosition();
         super.moveToPosition(targetPosition, this.speed);
      }
   }
}

export default WanderAI;