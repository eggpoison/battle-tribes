import Board, { TileCoordinates } from "../../Board";
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

      // Get nearby tiles
      let nearbyTileCoordinates = Board.getNearbyTileCoordinates(position, this.wanderRange);

      if (typeof this.entity.getInfo !== "undefined") {
         // Find nearby preferred tiles
         const preferredNearbyTileCoordinates = new Array<TileCoordinates>();
         for (const tileCoordinates of nearbyTileCoordinates) {
            const tileType = Board.getTileType(tileCoordinates[0], tileCoordinates[1]);

            if (this.entity.getInfo().preferredTileTypes!.includes(tileType)) {
               preferredNearbyTileCoordinates.push(tileCoordinates);
            }
         }

         nearbyTileCoordinates = preferredNearbyTileCoordinates;
      }

      // If there are no nearby tiles, return a random position in the current tile
      if (nearbyTileCoordinates.length === 0) {
         const x = Math.floor(position.x / Board.tileSize);
         const y = Math.floor(position.y / Board.tileSize);

         const targetPosition = Board.getRandomPositionInTile([x, y]);
         return targetPosition;
      }

      let targetTileCoordinates!: [number, number];
      // Choose a random nearby tile from the list of nearby tiles
      targetTileCoordinates = randItem(nearbyTileCoordinates);

      // Move to the target position
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