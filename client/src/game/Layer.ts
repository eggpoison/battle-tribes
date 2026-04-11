import { Point, randAngle, randFloat, randInt, TileIndex, SubtileType, TileType, GrassTileInfo, RiverFlowDirectionsRecord, WaterRockData, Entity, Settings, getTileIndexIncludingEdges, getSubtileIndex, getSubtileX, getSubtileY, CollisionGroup, subtileIsInWorldIncludingEdges, subtileIsInWorld } from "webgl-test-shared";
import Chunk from "./Chunk";
import { Light } from "./lights";
import Particle from "./Particle";
import { NUM_RENDER_LAYERS, RenderLayer } from "./render-layers";
import { getRenderChunkIndex, RENDER_CHUNK_SIZE, RenderChunkRiverInfo } from "./rendering/render-chunks";
import { addRenderable, removeRenderable, RenderableType } from "./rendering/render-loop";
import { renderLayerIsChunkRendered, registerChunkRenderedEntity, removeChunkRenderedEntity, RenderLayerModifyInfo, EntityChunkData, ChunkedRenderLayer, CHUNKED_RENDER_LAYERS, RenderLayerChunkDataRecord } from "./rendering/webgl/chunked-entity-rendering";
import { addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer, lowMonocolourParticles, lowTexturedParticles, ParticleRenderLayer } from "./rendering/webgl/particle-rendering";
import { recalculateWallSubtileRenderData, WALL_TILE_TEXTURE_SOURCE_RECORD } from "./rendering/webgl/solid-tile-rendering";
import { recalculateTileShadows, TileShadowType } from "./rendering/webgl/tile-shadow-rendering";
import { recalculateWallBorders } from "./rendering/webgl/wall-border-rendering";
import { playSound } from "./sound";
import { Tile } from "./Tile";

export default class Layer {
   public readonly idx: number;
   
   public readonly tiles: ReadonlyArray<Tile>;
   public readonly wallSubtileTypes: Float32Array;
   public readonly wallSubtileDamageTakenMap: Map<number, number>;
   public readonly riverFlowDirections: RiverFlowDirectionsRecord;
   public readonly waterRocks: Array<WaterRockData>;
   public readonly grassInfo: Partial<Record<number, Partial<Record<number, GrassTileInfo>>>>;

   /** All dropdown tiles in the layer */
   public readonly dropdownTiles: ReadonlyArray<TileIndex>;

   public readonly buildingBlockingTiles: ReadonlySet<TileIndex>;

   public readonly chunks: ReadonlyArray<Chunk>;

   public readonly collisionGroupChunks: Array<Array<Array<Entity>>> = [];

   public readonly wallSubtileVariants: Partial<Record<TileIndex, number>> = {};
   
   public readonly lights: Array<Light> = [];

   // For chunked entity rendering
   public readonly renderLayerChunkDataRecord: RenderLayerChunkDataRecord;
   public readonly visibleEntityChunkDatas: Record<ChunkedRenderLayer, Array<EntityChunkData>>;
   /** Each render layer contains a set of which chunks have been modified */
   public readonly modifiedChunkIndicesArray: Array<RenderLayerModifyInfo>;

   // @Speed: Polymorphism
   public riverInfoArray: Array<RenderChunkRiverInfo | null> = [];

   public readonly slimeTrailPixels = new Map<number, number>();
   
   // @Memory
   public readonly renderChunksWithWalls = new Set<number>();
   
   constructor(idx: number, tiles: ReadonlyArray<Tile>, buildingBlockingTiles: ReadonlySet<TileIndex>, wallSubtileTypes: Float32Array, wallSubtileDamageTakenMap: Map<number, number>, riverFlowDirections: RiverFlowDirectionsRecord, waterRocks: Array<WaterRockData>, grassInfo: Partial<Record<number, Partial<Record<number, GrassTileInfo>>>>) {
      this.idx = idx;
      this.wallSubtileTypes = wallSubtileTypes;
      this.wallSubtileDamageTakenMap = wallSubtileDamageTakenMap;
      this.tiles = tiles;
      this.buildingBlockingTiles = buildingBlockingTiles;
      this.riverFlowDirections = riverFlowDirections;
      this.waterRocks = waterRocks;
      this.grassInfo = grassInfo;

      // Create the chunk array
      const chunks: Array<Chunk> = [];
      for (let x = 0; x < Settings.WORLD_SIZE_CHUNKS; x++) {
         for (let y = 0; y < Settings.WORLD_SIZE_CHUNKS; y++) {
            const chunk = new Chunk(x, y);
            chunks.push(chunk);
         }
      }
      this.chunks = chunks;

      const LAYER_NUM_CHUNKS = Settings.WORLD_SIZE_CHUNKS * Settings.WORLD_SIZE_CHUNKS;
      for (let i = 0; i < CollisionGroup._LENGTH_; i++) {
         const collisionChunks: Array<Array<Entity>> = [];
         for (let j = 0; j < LAYER_NUM_CHUNKS; j++) {
            collisionChunks.push([]);
         }
         this.collisionGroupChunks.push(collisionChunks);
      }

      const dropdownTiles: Array<TileIndex> = [];
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

      // Create subtile variants
      for (let subtileY = -Settings.EDGE_GENERATION_DISTANCE * 4; subtileY < (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4; subtileY++) {
         for (let subtileX = -Settings.EDGE_GENERATION_DISTANCE * 4; subtileX < (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4; subtileX++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            const subtileType = wallSubtileTypes[subtileIndex] as SubtileType;
            if (subtileType !== SubtileType.none) {
               const textureSources = WALL_TILE_TEXTURE_SOURCE_RECORD[subtileType];
               if (textureSources === undefined) {
                  throw new Error();
               }
   
               const tileX = Math.floor(subtileX / 4);
               const tileY = Math.floor(subtileY / 4);
               const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
               this.wallSubtileVariants[tileIndex] = Math.floor(Math.random() * textureSources.length);

               if (subtileIsInWorld(subtileX, subtileY)) {
                  const renderChunkX = Math.floor(tileX / RENDER_CHUNK_SIZE);
                  const renderChunkY = Math.floor(tileY / RENDER_CHUNK_SIZE);
                  const renderChunkIndex = getRenderChunkIndex(renderChunkX, renderChunkY);
                  this.renderChunksWithWalls.add(renderChunkIndex);
               }
            }
         }
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

      this.visibleEntityChunkDatas = {} as Record<ChunkedRenderLayer, Array<EntityChunkData>>;
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

   public getCollisionChunkByIndex(collisionGroup: CollisionGroup, chunkIndex: number): Array<Entity> {
      return this.collisionGroupChunks[collisionGroup][chunkIndex];
   }

   public tileIsBuildingBlocking(tileIndex: TileIndex): boolean {
      return this.buildingBlockingTiles.has(tileIndex);
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
         playSound("stone-destroy-" + randInt(1, 2) + ".mp3", 0.6, 1, new Point(x, y), this);

         // Speck debris
         for (let i = 0; i < 7; i++) {
            const spawnOffsetDirection = randAngle();
            const spawnPositionX = x + 12 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = y + 12 * Math.cos(spawnOffsetDirection);
         
            const velocityMagnitude = randFloat(50, 70);
            const velocityDirection = randAngle();
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
               randAngle(),
               angularVelocity,
               0,
               Math.abs(angularVelocity) / lifetime / 1.5,
               colour, colour, colour
            );
            lowMonocolourParticles.push(particle);
         }
         
         // Larger debris pieces
         for (let i = 0; i < 5; i++) {
            const spawnOffsetMagnitude = 8 * Math.random();
            const spawnOffsetDirection = randAngle();
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
            const moveDirection = randAngle();
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
               randAngle(),
               1 * Math.PI * spinDirection,
               0,
               Math.abs(Math.PI * spinDirection),
               textureIndex,
               tint, tint, tint
            );
            lowTexturedParticles.push(particle);
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

   public getRiverFlowDirection(tileX: number, tileY: number): number {
      const rowDirections = this.riverFlowDirections[tileX];
      if (rowDirections === undefined) {
         throw new Error("Tried to get the river flow direction of a non-water tile.");
      }

      const direction = rowDirections[tileY];
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