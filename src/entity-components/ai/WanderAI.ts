import Board, { TileCoordinates } from "../../Board";
import SETTINGS from "../../settings";
import { randItem } from "../../utils";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

class WanderAI extends EntityAI {
   /** Chance for the entity to wander each second */
   private readonly wanderChance: number;
   private readonly wanderRange: number;
   private readonly wanderSpeed: number;

   constructor(wanderChance: number, wanderRange: number, wanderSpeed: number) {
      super("wander");

      // Throw an error if the mob has no preferred tile types
      // if (typeof this.entity.preferredTileTypes === "undefined") {
      //    throw new Error("Entity must have the preferredTileTypes field if it has a WanderAI ai!");
      // }

      this.wanderChance = wanderChance;
      this.wanderRange = wanderRange;
      this.wanderSpeed = wanderSpeed;
   }

   private wander(): void {
      const position = this.entity.getComponent(TransformComponent)!.position;

      // Get nearby tiles
      const nearbyTileCoordinates = Board.getNearbyTileCoordinates(position, this.wanderRange);
      
      // Find nearby preferred tiles
      const preferredNearbyTileCoordinates = new Array<TileCoordinates>();
      for (const tileCoordinates of nearbyTileCoordinates) {
         const tileType = Board.getTileType(tileCoordinates[0], tileCoordinates[1]);
         if (this.entity.preferredTileTypes!.includes(tileType)) {
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
      super.moveToPosition(targetPosition, this.wanderSpeed);
   }

   public tick(): void {
      super.tick();

      if (Math.random() < this.wanderChance / SETTINGS.tps) {
         this.wander();
      }
   }
}

export default WanderAI;