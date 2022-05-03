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
      const nearbyTileCoordinates = Board.getNearbyTileCoordinates(position, this.wanderRange);
      
      // Find nearby preferred tiles
      const preferredNearbyTileCoordinates = new Array<TileCoordinates>();
      for (const tileCoordinates of nearbyTileCoordinates) {
         const tileType = Board.getTileType(tileCoordinates[0], tileCoordinates[1]);
         if (this.entity.getInfo().preferredTileTypes!.includes(tileType)) {
            preferredNearbyTileCoordinates.push(tileCoordinates);
         }
      }

      let targetTileCoordinates!: [number, number];
      // If the entity has no preferred tiles
      if (preferredNearbyTileCoordinates.length === 0) {
         // Pick one from the list of all nearby tiles
         targetTileCoordinates = randItem(nearbyTileCoordinates);
      } else {
         // Otherwise choose a random nearby tile from the mob's preferred tile types
         targetTileCoordinates = randItem(preferredNearbyTileCoordinates);
      }

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