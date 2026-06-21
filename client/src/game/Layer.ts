import { RiverFlowDirectionsRecord, WaterRockData } from "../../../shared/src/client-server-types";
import { CollisionGroup } from "../../../shared/src/collision-groups";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { SubtileType, TileType } from "../../../shared/src/tiles";
import { getTileIndexIncludingEdges, TileIndex } from "../../../shared/src/utils";
import Chunk from "./Chunk";
import { Light } from "./lights";
import { NUM_RENDER_LAYERS, RenderLayer } from "./render-layers";
import { RenderChunkRiverInfo } from "./rendering/render-chunks";
import { addRenderable, removeRenderable, RenderableType } from "./rendering/render-loop";
import { renderLayerIsChunkRendered, registerChunkRenderedEntity, removeChunkRenderedEntity, RenderLayerModifyInfo, EntityChunkData, ChunkedRenderLayer, CHUNKED_RENDER_LAYERS, RenderLayerChunkDataRecord } from "./rendering/webgl/chunked-entity-rendering";
import { Tile } from "./Tile";

export default class Layer {
   public readonly idx: number;
   
   public readonly tiles: readonly Tile[];
   public readonly wallSubtileTypes: Uint8Array;
   public readonly wallSubtileDamageTakenMap: Map<number, number>;
   public readonly riverFlowDirections: RiverFlowDirectionsRecord;
   public readonly waterRocks: WaterRockData[];
   public readonly tileTemperatures: Float32Array;
   public readonly tileHumidities: Float32Array;

   /** All dropdown tiles in the layer */
   public readonly dropdownTiles: readonly TileIndex[];

   public readonly chunks: readonly Chunk[];

   public readonly collisionGroupChunks: Entity[][][] = [];

   public readonly lights: Light[] = [];

   // For chunked entity rendering
   public readonly renderLayerChunkDataRecord: RenderLayerChunkDataRecord;
   public readonly visibleEntityChunkDatas: Record<ChunkedRenderLayer, EntityChunkData[]>;
   /** Each render layer contains a set of which chunks have been modified */
   public readonly modifiedChunkIndicesArray: RenderLayerModifyInfo[];

   // @Speed: Polymorphism
   public riverInfoArray: (RenderChunkRiverInfo | null)[] = [];

   public readonly slimeTrailPixels = new Map<number, number>();
   
   constructor(idx: number, tiles: readonly Tile[], wallSubtileTypes: Uint8Array, wallSubtileDamageTakenMap: Map<number, number>, riverFlowDirections: RiverFlowDirectionsRecord, waterRocks: WaterRockData[], tileTemperatures: Float32Array, tileHumidities: Float32Array) {
      this.idx = idx;
      this.wallSubtileTypes = wallSubtileTypes;
      this.wallSubtileDamageTakenMap = wallSubtileDamageTakenMap;
      this.tiles = tiles;
      this.riverFlowDirections = riverFlowDirections;
      this.waterRocks = waterRocks;
      this.tileTemperatures = tileTemperatures;
      this.tileHumidities = tileHumidities;

      // Create the chunk array
      const chunks: Chunk[] = [];
      for (let x = 0; x < Settings.WORLD_SIZE_CHUNKS; x++) {
         for (let y = 0; y < Settings.WORLD_SIZE_CHUNKS; y++) {
            const chunk = new Chunk(x, y);
            chunks.push(chunk);
         }
      }
      this.chunks = chunks;

      const LAYER_NUM_CHUNKS = Settings.WORLD_SIZE_CHUNKS * Settings.WORLD_SIZE_CHUNKS;
      for (let i = 0; i < CollisionGroup._LENGTH_; i++) {
         const collisionChunks: Entity[][] = [];
         for (let j = 0; j < LAYER_NUM_CHUNKS; j++) {
            collisionChunks.push([]);
         }
         this.collisionGroupChunks.push(collisionChunks);
      }

      const dropdownTiles: TileIndex[] = [];
      for (let tileY = 0; tileY < Settings.WORLD_SIZE_TILES; tileY++) {
         for (let tileX = 0; tileX < Settings.WORLD_SIZE_TILES; tileX++) {
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
            const tile = this.getTile(tileIndex);
            if (tile.type === TileType.dropdown) {
               dropdownTiles.push(tileIndex);
            }
         }
      }
      this.dropdownTiles = dropdownTiles;

      this.renderLayerChunkDataRecord = {} as RenderLayerChunkDataRecord;
      for (const renderLayer of CHUNKED_RENDER_LAYERS) {
         this.renderLayerChunkDataRecord[renderLayer] = {};
      }

      this.modifiedChunkIndicesArray = [];
      for (let i = 0; i < NUM_RENDER_LAYERS; i++) {
         this.modifiedChunkIndicesArray.push({
            modifiedChunkIndices: new Set(),
            modifyInfoRecord: {}
         });
      }

      this.visibleEntityChunkDatas = {} as Record<ChunkedRenderLayer, EntityChunkData[]>;
      for (const renderLayer of CHUNKED_RENDER_LAYERS) {
         this.visibleEntityChunkDatas[renderLayer] = [];
      }
   }

   // @Temporary @Speed @Hack
   public getChunkIndex(chunk: Chunk): number {
      const idx = this.chunks.indexOf(chunk);
      if (idx === -1) {
         throw new Error();
      }
      return idx;
   }

   public getCollisionChunkByIndex(collisionGroup: CollisionGroup, chunkIndex: number): Entity[] {
      return this.collisionGroupChunks[collisionGroup][chunkIndex];
   }

   public setSubtile(subtileIndex: number, subtileType: SubtileType, damageTaken: number): void {
      this.wallSubtileTypes[subtileIndex] = subtileType;

      if (damageTaken > 0) {
         this.wallSubtileDamageTakenMap.set(subtileIndex, damageTaken);
      } else {
         this.wallSubtileDamageTakenMap.delete(subtileIndex);
      }
   }

   public getTile(tileIndex: TileIndex): Tile {
      return this.tiles[tileIndex];
   }

   public getTileXY(tileX: number, tileY: number): Tile {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tiles[tileIndex];
   }

   public subtileIsWall(subtileX: number, subtileY: number): boolean {
      const subtileIndex = getSubtileIndex(subtileX, subtileY);
      return this.wallSubtileTypes[subtileIndex] !== SubtileType.none;
   }

   /** Returns if the given subtile can support a wall but is mined out */
   public subtileIsMined(subtileIndex: number): boolean {
      return this.wallSubtileTypes[subtileIndex] === SubtileType.none && this.wallSubtileDamageTakenMap.has(subtileIndex);
   }

   public getSubtileType(subtileIndex: number): SubtileType {
      return this.wallSubtileTypes[subtileIndex];
   }

   public getChunk(chunkX: number, chunkY: number): Chunk {
      const chunkIndex = chunkY * Settings.WORLD_SIZE_CHUNKS + chunkX;
      return this.chunks[chunkIndex];
   }

   public getRiverFlowDirection(tileIndex: number): number {
      const direction = this.riverFlowDirections[tileIndex];
      if (direction === undefined) {
         throw new Error("Tried to get the river flow direction of a non-water tile.");
      }

      return direction;
   }

   public addEntityToRendering(entity: Entity, renderLayer: RenderLayer, renderHeight: number): void {
      if (renderLayerIsChunkRendered(renderLayer)) {
         registerChunkRenderedEntity(entity, this, renderLayer);
      } else {
         addRenderable(this, RenderableType.entity, entity, renderLayer, renderHeight);
      }
   }

   public removeEntityFromRendering(entity: Entity, renderLayer: RenderLayer): void {
      if (renderLayerIsChunkRendered(renderLayer)) {
         removeChunkRenderedEntity(entity, this, renderLayer);
      } else {
         removeRenderable(this, entity, renderLayer);
      }
   }
}