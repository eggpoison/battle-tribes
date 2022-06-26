import Board, { Coordinates } from "../../Board";
import SETTINGS from "../../settings";
import { BIOMES } from "../../terrain-generation";
import { Point, randInt, randItem } from "../../utils";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

type WanderAIInfo = {
   readonly range: number;
   /** The average number of times that the entity will wander in a second */
   readonly wanderRate: number;
   readonly acceleration: number;
   readonly terminalVelocity: number;
}

class WanderAI extends EntityAI {
   public readonly id: string;

   protected readonly range: number;
   /** Chance for the entity to wander each second */
   protected readonly wanderRate: number;
   protected readonly acceleration: number;
   protected readonly terminalVelocity: number;

   constructor(id: string, info: WanderAIInfo) {
      super();

      this.id = id;

      this.range = info.range;
      this.wanderRate = info.wanderRate;
      this.terminalVelocity = info.terminalVelocity;
      this.acceleration = info.acceleration
   }

   protected getRandomTargetPosition(): Point {
      const position = this.entity.getComponent(TransformComponent)!.position;

      // Get all nearby tiles
      let nearbyTileCoordinates = Board.getNearbyTileCoordinates(position, this.range);

      // If there are no eligible tiles, return a random position in the current tile
      if (nearbyTileCoordinates.length === 0) {
         const x = Math.floor(position.x / Board.tileSize);
         const y = Math.floor(position.y / Board.tileSize);

         const targetPosition = Board.getRandomPositionInTile(x, y);
         return targetPosition;
      }

      // Choose a random nearby tile from the list of nearby tiles
      const targetTileCoordinates = this.getTargetTileCoordinates(nearbyTileCoordinates);

      // Move to a random position in the chosen tile
      const targetPosition = Board.getRandomPositionInTile(...targetTileCoordinates);
      return targetPosition;
   }

   private getTargetTileCoordinates(tileCoordinateArray: Array<Coordinates>): Coordinates {
      // If the entity doesn't have entity info, return a random tile
      if (typeof this.entity.entityInfo === "undefined") return randItem(tileCoordinateArray);

      // How much more chance a tile from the spawn requirements has to be chosen
      const BIAS = 5;

      const idealBiomeNames = this.entity.entityInfo.spawnRequirements.biomes;
      const idealBiomes = BIOMES.filter(biome => idealBiomeNames.includes(biome.name));
      
      // Calculate the total weight of all cells
      let totalWeight = 0;
      for (const [x, y] of tileCoordinateArray) {
         totalWeight++;
         
         const tile = Board.getTile(x, y);
         if (idealBiomes.includes(tile.biome)) {
            totalWeight += BIAS;
         }
      }

      const targetWeight = randInt(1, totalWeight);
      let weight = 0;
      for (const coordinates of tileCoordinateArray) {
         weight++;
         
         const [x, y] = coordinates;
         const tile = Board.getTile(x, y);
         if (idealBiomes.includes(tile.biome)) {
            weight += BIAS;
         }

         if (weight >= targetWeight) {
            return coordinates;
         }
      }

      console.warn(tileCoordinateArray, targetWeight, totalWeight);
      throw new Error("Couldn't find a random tile!");
   }

   public tick(): void {
      super.tick();

      super.checkTargetPosition();

      // Don't choose a new location to wander to if already going to one
      if (this.targetPosition !== null) return;

      // Wander randomly
      if (Math.random() < this.wanderRate / SETTINGS.tps) {
         const targetPosition = this.getRandomTargetPosition();
         super.moveToPosition(targetPosition, this.terminalVelocity, this.acceleration);
      }
   }
}

export default WanderAI;