import { Settings } from "webgl-test-shared/dist/settings";
import { GrassTileInfo, RIVER_STEPPING_STONE_SIZES, RiverFlowDirections, RiverSteppingStoneData, ServerTileData, ServerTileUpdateData } from "webgl-test-shared/dist/client-server-types";
import { TileType } from "webgl-test-shared/dist/tiles";
import { Point, Vector } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import Chunk from "./Chunk";
import { Tile } from "./Tile";
import Entity from "./Entity";
import Particle from "./Particle";
import { highMonocolourBufferContainer, highTexturedBufferContainer, lowMonocolourBufferContainer, lowTexturedBufferContainer } from "./rendering/particle-rendering";
import ObjectBufferContainer from "./rendering/ObjectBufferContainer";
import { tempFloat32ArrayLength1 } from "./webgl";
import Player from "./entities/Player";
import Fish from "./entities/Fish";
import { NEIGHBOUR_OFFSETS } from "./utils";
import RenderPart from "./render-parts/RenderPart";

export interface EntityHitboxInfo {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>;
}

interface TickCallback {
   time: number;
   readonly callback: () => void;
}

abstract class Board {
   public static ticks: number;
   public static time: number;

   private static tiles = new Array<Tile>();
   private static chunks: Array<Chunk>;

   public static edgeRiverFlowDirections: RiverFlowDirections; 

   public static grassInfo: Record<number, Record<number, GrassTileInfo>>;

   public static numVisibleRenderParts = 0;
   /** Game objects sorted in descending render weight */
   public static readonly sortedEntities = new Array<Entity>();
   /** All fish in the board */
   public static readonly fish = new Array<Fish>();

   public static readonly entities = new Set<Entity>();
   public static readonly entityRecord: Partial<Record<number, Entity>> = {};

   public static readonly renderPartRecord: Record<number, RenderPart> = {};

   /** Stores all player entities in the game. Necessary for rendering their names. */
   public static readonly players = new Array<Player>();

   // @Cleanup This is too messy. Perhaps combine all into one
   // public static readonly particles = new Array<Particle>();
   public static readonly lowMonocolourParticles = new Array<Particle>();
   public static readonly lowTexturedParticles = new Array<Particle>();
   public static readonly highMonocolourParticles = new Array<Particle>();
   public static readonly highTexturedParticles = new Array<Particle>();

   private static riverFlowDirections: RiverFlowDirections;

   private static tickCallbacks = new Array<TickCallback>();

   // @Cleanup: This function gets called by Game.ts, which gets called by LoadingScreen.tsx, with these same parameters. This feels unnecessary.
   public static initialise(tiles: Array<Array<Tile>>, riverFlowDirections: RiverFlowDirections, edgeTiles: Array<ServerTileData>, edgeRiverFlowDirections: RiverFlowDirections, grassInfo: Record<number, Record<number, GrassTileInfo>>): void {
      const edgeTilesRecord: Record<number, Record<number, Tile>> = {};
      for (const tileData of edgeTiles) {
         if (!edgeTilesRecord.hasOwnProperty(tileData.x)) {
            edgeTilesRecord[tileData.x] = {};
         }
         edgeTilesRecord[tileData.x][tileData.y] = new Tile(tileData.x, tileData.y, tileData.type, tileData.biome, tileData.isWall);
      }

      // Combine the tiles and edge tiles
      this.tiles = [];
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
            if (tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS) {
               this.tiles.push(tiles[tileX][tileY]);
            } else {
               this.tiles.push(edgeTilesRecord[tileX][tileY]);
            }
         }
      }

      // Flag all tiles which border water or walls
      for (let i = 0; i < this.tiles.length; i++) {
         const tile = this.tiles[i];

         if (tile.isWall) {
            const tileX = i % (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2) - Settings.EDGE_GENERATION_DISTANCE;
            const tileY = Math.floor(i / (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2)) - Settings.EDGE_GENERATION_DISTANCE;

            for (let j = 0; j < NEIGHBOUR_OFFSETS.length; j++) {
               const neighbourTileX = tileX + NEIGHBOUR_OFFSETS[j][0];
               const neighbourTileY = tileY + NEIGHBOUR_OFFSETS[j][1];

               if (this.tileIsWithinEdge(neighbourTileX, neighbourTileY)) {
                  const neighbourTile = this.getTile(neighbourTileX, neighbourTileY);
                  neighbourTile.bordersWall = true;
               }
            }
         }

         if (tile.type === TileType.water) {
            const tileX = i % (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2) - Settings.EDGE_GENERATION_DISTANCE;
            const tileY = Math.floor(i / (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2)) - Settings.EDGE_GENERATION_DISTANCE;

            for (let j = 0; j < NEIGHBOUR_OFFSETS.length; j++) {
               const neighbourTileX = tileX + NEIGHBOUR_OFFSETS[j][0];
               const neighbourTileY = tileY + NEIGHBOUR_OFFSETS[j][1];

               if (this.tileIsWithinEdge(neighbourTileX, neighbourTileY)) {
                  const neighbourTile = this.getTile(neighbourTileX, neighbourTileY);
                  neighbourTile.bordersWater = true;
               }
            }
         }
      }
      
      // Create the chunk array
      this.chunks = [];
      for (let x = 0; x < Settings.BOARD_SIZE; x++) {
         for (let y = 0; y < Settings.BOARD_SIZE; y++) {
            const chunk = new Chunk(x, y);
            this.chunks.push(chunk);
         }
      }

      this.riverFlowDirections = riverFlowDirections;
      this.edgeRiverFlowDirections = edgeRiverFlowDirections;

      this.grassInfo = grassInfo;
   }

   public static addRiverSteppingStonesToChunks(steppingStones: ReadonlyArray<RiverSteppingStoneData>): void {
      for (const steppingStone of steppingStones) {
         const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];

         const minChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = this.getChunk(chunkX, chunkY);
               chunk.riverSteppingStones.push(steppingStone);
            }
         }
      }
   }

   public static addTickCallback(time: number, callback: () => void): void {
      this.tickCallbacks.push({
         time: time,
         callback: callback
      });
   }

   public static updateTickCallbacks(): void {
      for (let i = this.tickCallbacks.length - 1; i >= 0; i--) {
         const tickCallbackInfo = this.tickCallbacks[i];
         tickCallbackInfo.time -= 1 / Settings.TPS;
         if (tickCallbackInfo.time <= 0) {
            tickCallbackInfo.callback();
            this.tickCallbacks.splice(i, 1);
         }
      }
   }

   public static tickIntervalHasPassed(intervalSeconds: number): boolean {
      const ticksPerInterval = intervalSeconds * Settings.TPS;
      
      const previousCheck = (Board.ticks - 1) / ticksPerInterval;
      const check = Board.ticks / ticksPerInterval;
      return Math.floor(previousCheck) !== Math.floor(check);
   }

   public static addEntity(entity: Entity): void {
      this.entityRecord[entity.id] = entity;
      this.entities.add(entity);

      if (entity.type === EntityType.fish) {
         this.fish.push(entity as Fish);
      } else {
         // Add into the sorted array
         let idx = this.sortedEntities.length;
         for (let i = 0; i < this.sortedEntities.length; i++) {
            const currentEntity = this.sortedEntities[i];
            if (entity.renderDepth > currentEntity.renderDepth) {
               idx = i;
               break;
            }
         }
         this.sortedEntities.splice(idx, 0, entity);
      }
   }

   public static removeEntity(entity: Entity, isDeath: boolean): void {
      if (typeof entity === "undefined") {
         throw new Error("Tried to remove an undefined entity.");
      }

      delete Board.entityRecord[entity.id];

      if (isDeath) {
         entity.die();
      }
      entity.remove();

      if (entity.type === EntityType.player) {
         const idx = Board.players.indexOf(entity as Player);
         if (idx !== -1) {
            Board.players.splice(idx, 1);
         }
      }

      for (const chunk of entity.chunks) {
         chunk.removeEntity(entity);
      }
   
      this.entities.delete(entity);
      if (entity.type === EntityType.fish) {
         const idx = this.fish.indexOf(entity as Fish);
         if (idx !== -1) {
            this.fish.splice(idx, 1);
         }
      } else {
         this.sortedEntities.splice(this.sortedEntities.indexOf(entity), 1);
      }
   
      this.numVisibleRenderParts -= entity.allRenderParts.length;
   }

   public static getRiverFlowDirection(tileX: number, tileY: number): number {
      const rowDirections = this.riverFlowDirections[tileX];
      if (typeof rowDirections === "undefined") {
         throw new Error("Tried to get the river flow direction of a non-water tile.");
      }

      const direction = rowDirections[tileY];
      if (typeof direction === "undefined") {
         throw new Error("Tried to get the river flow direction of a non-water tile.");
      }
      
      return direction;
   }

   public static getEdgeRiverFlowDirection(tileX: number, tileY: number): number {
      const rowDirections = this.riverFlowDirections[tileX];
      if (typeof rowDirections !== "undefined") {
         const direction = rowDirections[tileY];
         if (typeof direction !== "undefined") {
            return direction;
         }
      }
      const edgeRowDirections = this.edgeRiverFlowDirections[tileX];
      if (typeof edgeRowDirections !== "undefined") {
         const direction = edgeRowDirections[tileY];
         if (typeof direction !== "undefined") {
            return direction;
         }
      }

      throw new Error("Tried to get the river flow direction of a non-water tile.");
   }

   public static getTile(tileX: number, tileY: number): Tile {
      const x = tileX + Settings.EDGE_GENERATION_DISTANCE;
      const y = tileY + Settings.EDGE_GENERATION_DISTANCE;
      return this.tiles[y * (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2) + x];
   }

   public static tileIsWithinEdge(tileX: number, tileY: number): boolean {
      return tileX >= -Settings.EDGE_GENERATION_DISTANCE && tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY >= -Settings.EDGE_GENERATION_DISTANCE && tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE;
   }

   public static getChunk(chunkX: number, chunkY: number): Chunk {
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      return this.chunks[chunkIndex];
   }

   public static getChunks(): ReadonlyArray<Readonly<Chunk>> {
      return this.chunks;
   }

   private static updateParticleArray(particles: Array<Particle>, bufferContainer: ObjectBufferContainer): void {
      const removedParticleIndexes = new Array<number>();
      for (let i = 0; i < particles.length; i++) {
         const particle = particles[i];

         particle.age += 1 / Settings.TPS;
         if (particle.age >= particle.lifetime) {
            removedParticleIndexes.push(i);
         } else {
            // Update opacity
            if (typeof particle.getOpacity !== "undefined") {
               const opacity = particle.getOpacity();
               tempFloat32ArrayLength1[0] = opacity;
               bufferContainer.setData(particle.id, 10, tempFloat32ArrayLength1);
            }
            // Update scale
            if (typeof particle.getScale !== "undefined") {
               const scale = particle.getScale();
               tempFloat32ArrayLength1[0] = scale;
               bufferContainer.setData(particle.id, 11, tempFloat32ArrayLength1);
            }
         }
      }

      // Remove removed particles
      for (let i = removedParticleIndexes.length - 1; i >= 0; i--) {
         const idx = removedParticleIndexes[i];
         const particle = particles[idx];

         bufferContainer.removeObject(particle.id);
         particles.splice(idx, 1);
      }
   }

   public static updateParticles(): void {
      this.updateParticleArray(this.lowMonocolourParticles, lowMonocolourBufferContainer);
      this.updateParticleArray(this.lowTexturedParticles, lowTexturedBufferContainer);
      this.updateParticleArray(this.highMonocolourParticles, highMonocolourBufferContainer);
      this.updateParticleArray(this.highTexturedParticles, highTexturedBufferContainer);
   }

   /** Ticks all game objects without updating them */
   public static tickEntities(): void {
      for (const entity of this.entities) {
         entity.tick();
      }
   }

   public static updateEntities(): void {
      for (const entity of this.entities) {
         entity.tick();
         entity.update();
      }
   }

   /** Updates the client's copy of the tiles array to match any tile updates that have occurred */
   public static loadTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const update of tileUpdates) {
         const tileX = update.tileIndex % Settings.BOARD_DIMENSIONS;
         const tileY = Math.floor(update.tileIndex / Settings.BOARD_DIMENSIONS);
         
         let tile = this.getTile(tileX, tileY);
         tile.type = update.type;
         tile.isWall = update.isWall;
      }
   }

   public static tileIsInBoard(tileX: number, tileY: number): boolean {
      return tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS;
   }
}

export default Board;