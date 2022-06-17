import Board, { Coordinates } from "../../Board";
import ENTITY_INFO from "../../data/entity-info";
import TILE_INFO from "../../data/tile-types";
import SETTINGS from "../../settings";
import { Biome, BIOMES, TileType } from "../../terrain-generation";
import { Point, randItem } from "../../utils";
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
      const targetTileCoordinates = randItem(nearbyTileCoordinates);

      // Move to a random position in the chosen tile
      const targetPosition = Board.getRandomPositionInTile(...targetTileCoordinates);
      return targetPosition;
   }

   private getTileWeight(tileCoordinates: Coordinates): void {
      const tile = Board.getTile(...tileCoordinates);
      const biome = tile.biome;
      
      const idealBiomes = this.entity.entityInfo.spawnRequirements.biomes;

      let minHumidityDist = 0;
      
      for (const biomeName of idealBiomes) {
         let biome!: Biome;
         for (const currentBiome of BIOMES) {
            if (currentBiome.name === biomeName) {
               biome = currentBiome;
               break;
            }
         }

         

         for (const generationInfo of biome.tiles) {
            const distDifference = Math.abs()
         }
      }
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