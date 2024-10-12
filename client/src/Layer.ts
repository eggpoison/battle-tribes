import { EntityInfo } from "../../shared/src/board-interface";
import { GrassTileInfo, RiverFlowDirectionsRecord, RiverSteppingStoneData, WaterRockData } from "../../shared/src/client-server-types";
import { EntityID } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { WorldInfo } from "../../shared/src/structures";
import { SubtileType } from "../../shared/src/tiles";
import { Point, randFloat, randInt, TileIndex } from "../../shared/src/utils";
import Board from "./Board";
import Chunk from "./Chunk";
import { TransformComponentArray } from "./entity-components/TransformComponent";
import Particle from "./Particle";
import { getEntityRenderLayer } from "./render-layers";
import { RENDER_CHUNK_SIZE } from "./rendering/render-chunks";
import { addRenderable, removeRenderable, RenderableType } from "./rendering/render-loop";
import { removeEntityFromDirtyArray } from "./rendering/render-part-matrices";
import { renderLayerIsChunkRendered, registerChunkRenderedEntity, removeChunkRenderedEntity } from "./rendering/webgl/chunked-entity-rendering";
import { addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer, ParticleRenderLayer } from "./rendering/webgl/particle-rendering";
import { recalculateWallSubtileRenderData, WALL_TILE_TEXTURE_SOURCE_RECORD } from "./rendering/webgl/solid-tile-rendering";
import { recalculateTileShadows, TileShadowType } from "./rendering/webgl/tile-shadow-rendering";
import { recalculateWallBorders } from "./rendering/webgl/wall-border-rendering";
import { playSound } from "./sound";
import { Tile } from "./Tile";
import { getEntityType } from "./world";

export function getTileIndexIncludingEdges(tileX: number, tileY: number): TileIndex {
   if (tileX < -Settings.EDGE_GENERATION_DISTANCE || tileX >= Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE || tileY < -Settings.EDGE_GENERATION_DISTANCE || tileY >= Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
      throw new Error("Outside of world bounds!");
   }
   
   return (tileY + Settings.EDGE_GENERATION_DISTANCE) * (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2) + tileX + Settings.EDGE_GENERATION_DISTANCE;
}

export function tileIsWithinEdge(tileX: number, tileY: number): boolean {
   return tileX >= -Settings.EDGE_GENERATION_DISTANCE && tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY >= -Settings.EDGE_GENERATION_DISTANCE && tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE;
}

export function tileIsInWorld(tileX: number, tileY: number): boolean {
   return tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS;
}

export function getSubtileIndex(subtileX: number, subtileY: number): number {
   return (subtileY + Settings.EDGE_GENERATION_DISTANCE * 4) * Settings.FULL_BOARD_DIMENSIONS * 4 + subtileX + Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getSubtileX(subtileIndex: number): number {
   return subtileIndex % (Settings.FULL_BOARD_DIMENSIONS * 4) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getSubtileY(subtileIndex: number): number {
   return Math.floor(subtileIndex / (Settings.FULL_BOARD_DIMENSIONS * 4)) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function subtileIsInWorld(subtileX: number, subtileY: number): boolean {
   return subtileX >= -Settings.EDGE_GENERATION_DISTANCE * 4 && subtileX < (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4 && subtileY >= -Settings.EDGE_GENERATION_DISTANCE * 4 && subtileY < (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4;
}

export default class Layer {
   public readonly idx: number;
   
   public readonly tiles: ReadonlyArray<Tile>;
   public readonly wallSubtileTypes: Float32Array;
   public readonly wallSubtileDamageTakenMap: Map<number, number>;
   public readonly riverFlowDirections: RiverFlowDirectionsRecord;
   public readonly waterRocks: Array<WaterRockData>;
   public readonly riverSteppingStones: Array<RiverSteppingStoneData>;
   public readonly grassInfo: Record<number, Record<number, GrassTileInfo>>;

   public readonly chunks: ReadonlyArray<Chunk>;

   public readonly wallSubtileVariants: Partial<Record<TileIndex, number>> = {};

   constructor(idx: number, tiles: ReadonlyArray<Tile>, wallSubtileTypes: Float32Array, wallSubtileDamageTakenMap: Map<number, number>, riverFlowDirections: RiverFlowDirectionsRecord, waterRocks: Array<WaterRockData>, riverSteppingStones: Array<RiverSteppingStoneData>, grassInfo: Record<number, Record<number, GrassTileInfo>>) {
      this.idx = idx;
      this.wallSubtileTypes = wallSubtileTypes;
      this.wallSubtileDamageTakenMap = wallSubtileDamageTakenMap;
      this.tiles = tiles;
      this.riverFlowDirections = riverFlowDirections;
      this.waterRocks = waterRocks;
      this.riverSteppingStones = riverSteppingStones;
      this.grassInfo = grassInfo;

      // Create the chunk array
      const chunks = new Array<Chunk>();
      for (let x = 0; x < Settings.BOARD_SIZE; x++) {
         for (let y = 0; y < Settings.BOARD_SIZE; y++) {
            const chunk = new Chunk(x, y);
            chunks.push(chunk);
         }
      }
      this.chunks = chunks;

      // Create subtile variants
      for (let subtileX = -Settings.EDGE_GENERATION_DISTANCE * 4; subtileX < (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4; subtileX++) {
         for (let subtileY = -Settings.EDGE_GENERATION_DISTANCE * 4; subtileY < (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) * 4; subtileY++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            const subtileType = wallSubtileTypes[subtileIndex] as SubtileType;
            if (subtileType !== SubtileType.none) {
               const textureSources = WALL_TILE_TEXTURE_SOURCE_RECORD[subtileType];
               if (typeof textureSources === "undefined") {
                  throw new Error();
               }
   
               const tileX = Math.floor(subtileX / 4);
               const tileY = Math.floor(subtileY / 4);
               const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
               this.wallSubtileVariants[tileIndex] = Math.floor(Math.random() * textureSources.length);
            }
         }
      }
   }

   private recalculateRenderChunkWalls(renderChunkX: number, renderChunkY: number): void {
      recalculateWallSubtileRenderData(this, renderChunkX, renderChunkY);
      recalculateTileShadows(this, renderChunkX, renderChunkY, TileShadowType.wallShadow);
      recalculateWallBorders(this, renderChunkX, renderChunkY);
   }

   public registerSubtileUpdate(subtileIndex: number, subtileType: SubtileType, damageTaken: number): void {
      const subtileX = getSubtileX(subtileIndex);
      const subtileY = getSubtileY(subtileIndex);

      // If the subtile is destroyed, play vfx
      if (subtileType === SubtileType.none && this.wallSubtileTypes[subtileIndex] !== SubtileType.none) {
         const x = (subtileX + 0.5) * Settings.SUBTILE_SIZE;
         const y = (subtileY + 0.5) * Settings.SUBTILE_SIZE;
         playSound("stone-destroy-" + randInt(1, 2) + ".mp3", 0.6, 1, new Point(x, y));

         // Speck debris
         for (let i = 0; i < 7; i++) {
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = x + 12 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = y + 12 * Math.cos(spawnOffsetDirection);
         
            const velocityMagnitude = randFloat(50, 70);
            const velocityDirection = 2 * Math.PI * Math.random();
            const velocityX = velocityMagnitude * Math.sin(velocityDirection);
            const velocityY = velocityMagnitude * Math.cos(velocityDirection);
         
            const lifetime = randFloat(0.9, 1.5);
            
            const particle = new Particle(lifetime);
            particle.getOpacity = (): number => {
               return Math.pow(1 - particle.age / lifetime, 0.3);
            }
            
            const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;
            
            const colour = randFloat(0.5, 0.75);
            const scale = randFloat(1, 1.35);
         
            const baseSize = Math.random() < 0.6 ? 4 : 6;
         
            addMonocolourParticleToBufferContainer(
               particle,
               ParticleRenderLayer.low,
               baseSize * scale, baseSize * scale,
               spawnPositionX, spawnPositionY,
               velocityX, velocityY,
               0, 0,
               velocityMagnitude / lifetime / 0.7,
               2 * Math.PI * Math.random(),
               angularVelocity,
               0,
               Math.abs(angularVelocity) / lifetime / 1.5,
               colour, colour, colour
            );
            Board.lowMonocolourParticles.push(particle);
         }
         
         // Larger debris pieces
         for (let i = 0; i < 5; i++) {
            const spawnOffsetMagnitude = 8 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const particleX = x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const particleY = y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
            
            const lifetime = randFloat(20, 30);

            let textureIndex: number;
            if (Math.random() < 0.4) {
               // Large rock
               textureIndex = 8 * 1 + 3;
            } else {
               // Small rock
               textureIndex = 8 * 1 + 2;
            }

            const moveSpeed = randFloat(20, 40);
            const moveDirection = 2 * Math.PI * Math.random();
            const velocityX = moveSpeed * Math.sin(moveDirection);
            const velocityY = moveSpeed * Math.cos(moveDirection);

            const spinDirection = randFloat(-1, 1);
            
            const particle = new Particle(lifetime);
            particle.getOpacity = (): number => {
               return 1 - Math.pow(particle.age / lifetime, 2);
            };

            const tint = this.wallSubtileTypes[subtileIndex] === SubtileType.rockWall ? randFloat(-0.1, -0.2) : randFloat(-0.3, -0.5);
            
            addTexturedParticleToBufferContainer(
               particle,
               ParticleRenderLayer.low,
               64, 64,
               particleX, particleY,
               velocityX, velocityY,
               0, 0,
               moveSpeed * 1.5,
               2 * Math.PI * Math.random(),
               1 * Math.PI * spinDirection,
               0,
               Math.abs(Math.PI * spinDirection),
               textureIndex,
               tint, tint, tint
            );
            Board.lowTexturedParticles.push(particle);
         }
      }
      
      this.wallSubtileTypes[subtileIndex] = subtileType;

      if (damageTaken > 0) {
         this.wallSubtileDamageTakenMap.set(subtileIndex, damageTaken);
      } else {
         this.wallSubtileDamageTakenMap.delete(subtileIndex);
      }

      const minRenderChunkX = Math.floor((subtileX - 1) / 4 / RENDER_CHUNK_SIZE);
      const maxRenderChunkX = Math.floor((subtileX + 1) / 4 / RENDER_CHUNK_SIZE);
      const minRenderChunkY = Math.floor((subtileY - 1) / 4 / RENDER_CHUNK_SIZE);
      const maxRenderChunkY = Math.floor((subtileY + 1) / 4 / RENDER_CHUNK_SIZE);

      // @Speed: We can probably batch these together
      for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
         for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
            this.recalculateRenderChunkWalls(renderChunkX, renderChunkY);
         }
      }
   }

   public getTile(tileIndex: TileIndex): Tile {
      return this.tiles[tileIndex];
   }

   public getTileFromCoords(tileX: number, tileY: number): Tile {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tiles[tileIndex];
   }

   public subtileIsWall(subtileX: number, subtileY: number): boolean {
      const subtileIndex = getSubtileIndex(subtileX, subtileY);
      return this.wallSubtileTypes[subtileIndex] !== SubtileType.none;
   }

   public getWallSubtileType(subtileX: number, subtileY: number): SubtileType {
      const subtileIndex = getSubtileIndex(subtileX, subtileY);
      return this.wallSubtileTypes[subtileIndex];
   }

   public getChunk(chunkX: number, chunkY: number): Chunk {
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      return this.chunks[chunkIndex];
   }

   public getRiverFlowDirection(tileX: number, tileY: number): number {
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

   public addEntity(entity: EntityID): void {
      const renderLayer = getEntityRenderLayer(entity);
      if (renderLayerIsChunkRendered(renderLayer)) {
         registerChunkRenderedEntity(entity, renderLayer);
      } else {
         addRenderable(this, RenderableType.entity, entity, renderLayer);
      }
   }

   public removeEntity(entity: EntityID): void {
      const renderLayer = getEntityRenderLayer(entity);
      if (renderLayerIsChunkRendered(renderLayer)) {
         removeChunkRenderedEntity(entity, renderLayer);
      } else {
         removeRenderable(this, entity, renderLayer);
      }
      removeEntityFromDirtyArray(entity);
   }

   public getWorldInfo(): WorldInfo {
      return {
         chunks: this.chunks,
         getEntityCallback: (entity: EntityID): EntityInfo => {
            const transformComponent = TransformComponentArray.getComponent(entity);

            return {
               type: getEntityType(entity),
               position: transformComponent.position,
               rotation: transformComponent.rotation,
               id: entity,
               hitboxes: transformComponent.hitboxes
            };
         }
      }
   }
}