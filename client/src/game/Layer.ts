import { RiverFlowDirectionsRecord } from "../../../shared/src/client-server-types";
import { CollisionGroup } from "../../../shared/src/collision-groups";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { SubtileIndex, SubtileType } from "../../../shared/src/subtiles";
import { getTileIndexIncludingEdges, TileIndex } from "../../../shared/src/tiles";
import Chunk from "./Chunk";
import { Light } from "./lights";
import { NUM_RENDER_LAYERS, RenderLayer } from "./render-layers";
import { EdgeType, RenderChunkEdgeInfo, RenderChunkRiverInfo, RenderChunkShadowInfo, RenderChunkWallBorderInfo } from "./rendering/render-chunks";
import { addRenderable, removeRenderable, RenderableType } from "./rendering/render-loop";
import { renderLayerIsChunkRendered, registerChunkRenderedEntity, removeChunkRenderedEntity, RenderLayerModifyInfo, EntityChunkData, ChunkedRenderLayer, CHUNKED_RENDER_LAYERS, RenderLayerChunkDataRecord } from "./rendering/webgl/chunked-entity-rendering";
import { SolidTileRenderInfo } from "./rendering/webgl/solid-tile-rendering";
import { TileShadowType } from "./rendering/webgl/tile-shadow-rendering";
import { Tile } from "./Tile";

export default class Layer {
   public readonly idx: number;
   
   public readonly tiles: Map<TileIndex, Tile>;
   public readonly wallSubtileDatas: Map<SubtileIndex, number>;
   public readonly riverFlowDirections: RiverFlowDirectionsRecord;
   public readonly tileTemperatures: Map<TileIndex, number>;
   public readonly tileHumidities: Map<TileIndex, number>;

   /** All dropdown tiles in the layer */
   public readonly dropdownTiles: TileIndex[];

   public readonly chunks: readonly Chunk[];

   public readonly collisionGroupChunks: Entity[][][] = [];

   public readonly lights: Light[] = [];

   // For chunked entity rendering
   public readonly renderLayerChunkDataRecord: RenderLayerChunkDataRecord;
   public readonly visibleEntityChunkDatas: Record<ChunkedRenderLayer, EntityChunkData[]>;
   /** Each render layer contains a set of which chunks have been modified */
   public readonly modifiedChunkIndicesArray: RenderLayerModifyInfo[];

   public readonly riverInfoMap = new Map<number, RenderChunkRiverInfo>();

   public readonly slimeTrailPixels = new Map<number, number>();

   public groundTileInfoMap = new Map<number, SolidTileRenderInfo>();
   public wallTileInfoMap = new Map<number, SolidTileRenderInfo>();

   public readonly edgeInfoMaps: Record<EdgeType, Map<number, RenderChunkEdgeInfo>>;
   public readonly tileShadowInfoArrays: Record<TileShadowType, Map<number, RenderChunkShadowInfo>> = {
      [TileShadowType.dropdown]: new Map(),
      [TileShadowType.wall]: new Map()
   };
   public readonly wallBorderInfoMap = new Map<number, RenderChunkWallBorderInfo>();
   
   constructor(idx: number, tiles: Map<TileIndex, Tile>, wallSubtileDatas: Map<SubtileIndex, number>, riverFlowDirections: RiverFlowDirectionsRecord, tileTemperatures: Map<TileIndex, number>, tileHumidities: Map<TileIndex, number>, dropdownTiles: TileIndex[], edgeInfoMaps: Record<EdgeType, Map<number, RenderChunkEdgeInfo>>) {
      this.idx = idx;
      this.wallSubtileDatas = wallSubtileDatas;
      this.tiles = tiles;
      this.riverFlowDirections = riverFlowDirections;
      this.tileTemperatures = tileTemperatures;
      this.tileHumidities = tileHumidities;

      this.dropdownTiles = dropdownTiles;
      this.edgeInfoMaps = edgeInfoMaps;

      // Create the chunk array
      const chunks: Chunk[] = [];
      for (let i = 0; i < Settings.WORLD_SIZE_CHUNKS ** 2; i++) {
         chunks.push(new Chunk());
      }
      this.chunks = chunks;

      for (let i = 0; i < CollisionGroup._LENGTH_; i++) {
         const collisionChunks: Entity[][] = [];
         for (let j = 0; j < Settings.WORLD_SIZE_CHUNKS ** 2; j++) {
            collisionChunks.push([]);
         }
         this.collisionGroupChunks.push(collisionChunks);
      }


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

   public setSubtileData(subtileIndex: number, data: number): void {
      this.wallSubtileDatas.set(subtileIndex, data);
   }

   public getTile(tileIndex: TileIndex): Tile {
      return this.tiles.get(tileIndex)!;
   }

   public hasTileXY(tileX: number, tileY: number): boolean {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tiles.has(tileIndex);
   }

   public getTileXY(tileX: number, tileY: number): Tile {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tiles.get(tileIndex)!;
   }

   public subtileIsWall(subtileIndex: number): boolean {
      const subtileType = this.getSubtileType(subtileIndex);
      return subtileType !== SubtileType.none;
   }

   public getSubtileType(subtileIndex: number): SubtileType {
      const data = this.wallSubtileDatas.get(subtileIndex)!;
      return data >> 2;
   }

   public getSubtileData(subtileIndex: number): number {
      return this.wallSubtileDatas.get(subtileIndex)!;
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