import { Settings } from "battletribes-shared/settings";
import { GrassTileInfo, RIVER_STEPPING_STONE_SIZES, RiverFlowDirectionsRecord, RiverSteppingStoneData, ServerTileUpdateData } from "battletribes-shared/client-server-types";
import { TileType } from "battletribes-shared/tiles";
import { Point, Vector } from "battletribes-shared/utils";
import { EntityID, EntityTypeString } from "battletribes-shared/entities";
import Chunk from "./Chunk";
import { Tile } from "./Tile";
import Entity from "./Entity";
import Particle from "./Particle";
import { highMonocolourBufferContainer, highTexturedBufferContainer, lowMonocolourBufferContainer, lowTexturedBufferContainer } from "./rendering/webgl/particle-rendering";
import ObjectBufferContainer from "./rendering/ObjectBufferContainer";
import { tempFloat32ArrayLength1 } from "./webgl";
import { NEIGHBOUR_OFFSETS } from "./utils";
import { RenderableType, addRenderable, removeRenderable } from "./rendering/render-loop";
import { WorldInfo } from "battletribes-shared/structures";
import { EntityInfo } from "battletribes-shared/board-interface";
import { ServerComponentType } from "battletribes-shared/components";
import { RenderPart } from "./render-parts/render-parts";
import { InitialGameDataPacket } from "./client/packet-processing";
import { addEntityToRenderHeightMap } from "./rendering/webgl/entity-rendering";
import { getComponentArrays } from "./entity-components/ComponentArray";
import { removeEntityFromDirtyArray } from "./rendering/render-part-matrices";
import { getEntityRenderLayer } from "./render-layers";
import { registerChunkRenderedEntity, removeChunkRenderedEntity, renderLayerIsChunkRendered } from "./rendering/webgl/chunked-entity-rendering";
import { getFrameProgress } from "./Game";

export interface EntityHitboxInfo {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>;
}

interface TickCallback {
   time: number;
   readonly callback: () => void;
}

abstract class Board {
   public static serverTicks: number;
   public static clientTicks = 0;
   public static time: number;

   public static tiles: ReadonlyArray<Tile>;
   public static chunks: Array<Chunk>;
   
   public static grassInfo: Record<number, Record<number, GrassTileInfo>>;
   public static riverFlowDirections: RiverFlowDirectionsRecord;

   public static entityRecord: Partial<Record<number, Entity>> = {};

   public static renderPartRecord: Record<number, RenderPart> = {};

   // @Cleanup This is too messy. Perhaps combine all into one
   // public static readonly particles = new Array<Particle>();
   public static lowMonocolourParticles = new Array<Particle>();
   public static lowTexturedParticles = new Array<Particle>();
   public static highMonocolourParticles = new Array<Particle>();
   public static highTexturedParticles = new Array<Particle>();

   public static tickCallbacks = new Array<TickCallback>();

   // @Cleanup: This function gets called by Game.ts, which gets called by LoadingScreen.tsx, with these same parameters. This feels unnecessary.
   public static initialise(initialGameDataPacket: InitialGameDataPacket): void {
      this.tiles = initialGameDataPacket.tiles;

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

      this.riverFlowDirections = initialGameDataPacket.riverFlowDirections;

      this.grassInfo = initialGameDataPacket.grassInfo;
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
      
      const previousCheck = (Board.serverTicks - 1) / ticksPerInterval;
      const check = Board.serverTicks / ticksPerInterval;
      return Math.floor(previousCheck) !== Math.floor(check);
   }

   public static addEntity(entity: Entity): void {
      entity.callOnLoadFunctions();

      this.entityRecord[entity.id] = entity;

      // @Temporary? useless now?
      addEntityToRenderHeightMap(entity);

      const renderLayer = getEntityRenderLayer(entity);
      if (renderLayerIsChunkRendered(renderLayer)) {
         registerChunkRenderedEntity(entity, renderLayer);
      } else {
         addRenderable(RenderableType.entity, entity, renderLayer);
      }
   }

   public static removeEntity(entity: Entity, isDeath: boolean): void {
      const renderLayer = getEntityRenderLayer(entity);
      if (renderLayerIsChunkRendered(renderLayer)) {
         removeChunkRenderedEntity(entity, renderLayer);
      } else {
         removeRenderable(entity, renderLayer);
      }
      removeEntityFromDirtyArray(entity);

      delete Board.entityRecord[entity.id];

      if (isDeath) {
         entity.die();
      }
      entity.remove();

      for (let i = 0; i < entity.components.length; i++) {
         const component = entity.components[i];
         if (typeof component.onRemove !== "undefined") {
            component.onRemove();
         }
      }

      // Remove from component arrays
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.hasComponent(entity.id)) {
            componentArray.removeComponent(entity.id);
         }
      }
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
      const componentArrays = getComponentArrays();
      
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onTick !== "undefined") {
            for (let j = 0; j < componentArray.activeComponents.length; j++) {
               const component = componentArray.activeComponents[j];
               const entity = componentArray.activeEntities[j];
               componentArray.onTick(component, entity);
            }
         }
         
         componentArray.deactivateQueue();
      }
   }

   public static updateEntities(): void {
      const componentArrays = getComponentArrays();
      
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onUpdate !== "undefined") {
            for (let j = 0; j < componentArray.components.length; j++) {
               const component = componentArray.components[j];
               // @Temporary @Hack
               componentArray.onUpdate(component, 0);
            }
         }
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

   public static positionIsInBoard(x: number, y: number): boolean {
      return x >= 0 && x < Settings.BOARD_UNITS && y >= 0 && y < Settings.BOARD_UNITS;
   }

   public static tileIsInBoard(tileX: number, tileY: number): boolean {
      return tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS;
   }

   public static getTileX(tileIndex: number): number {
      return tileIndex % Settings.FULL_BOARD_DIMENSIONS - Settings.EDGE_GENERATION_DISTANCE;
   }

   public static getTileY(tileIndex: number): number {
      return Math.floor(tileIndex / Settings.FULL_BOARD_DIMENSIONS) - Settings.EDGE_GENERATION_DISTANCE;
   }

   public static getWorldInfo(): WorldInfo {
      return {
         chunks: Board.chunks,
         getEntityCallback: (entityID: EntityID): EntityInfo => {
            const entity = Board.entityRecord[entityID]!;
            const transformComponent = entity.getServerComponent(ServerComponentType.transform);

            return {
               type: entity.type,
               position: transformComponent.position,
               rotation: transformComponent.rotation,
               id: entityID,
               hitboxes: transformComponent.hitboxes
            };
         }
      }
   }
}

export default Board;

export function getSecondsSinceTickTimestamp(ticks: number): number {
   const ticksSince = Board.serverTicks - ticks;
   let secondsSince = ticksSince / Settings.TPS;

   // Account for frame progress
   secondsSince += getFrameProgress() / Settings.TPS;

   return secondsSince;
}

export function getElapsedTimeInSeconds(elapsedTicks: number): number {
   let secondsSince = elapsedTicks / Settings.TPS;

   // Account for frame progress
   secondsSince += getFrameProgress() / Settings.TPS;

   return secondsSince;
}

if (module.hot) {
   module.hot.dispose(data => {
      data.serverTicks = Board.serverTicks;
      data.clientTicks = Board.clientTicks;
      data.time = Board.time;
      data.tiles = Board.tiles;
      data.chunks = Board.chunks;
      data.grassInfo = Board.grassInfo;
      data.riverFlowDirections = Board.riverFlowDirections;
      data.entityRecord = Board.entityRecord;
      data.renderPartRecord = Board.renderPartRecord;
      data.lowMonocolourParticles = Board.lowMonocolourParticles;
      data.lowTexturedParticles = Board.lowTexturedParticles;
      data.highMonocolourParticles = Board.highMonocolourParticles;
      data.highTexturedParticles = Board.highTexturedParticles;
      data.tickCallbacks = Board.tickCallbacks;
   });

   if (module.hot.data) {
      Board.serverTicks = module.hot.data.serverTicks;
      Board.clientTicks = module.hot.data.clientTicks;
      Board.time = module.hot.data.time;
      Board.tiles = module.hot.data.tiles;
      Board.chunks = module.hot.data.chunks;
      Board.grassInfo = module.hot.data.grassInfo;
      Board.riverFlowDirections = module.hot.data.riverFlowDirections;
      Board.entityRecord = module.hot.data.entityRecord;
      Board.renderPartRecord = module.hot.data.renderPartRecord;
      Board.lowMonocolourParticles = module.hot.data.lowMonocolourParticles;
      Board.lowTexturedParticles = module.hot.data.lowTexturedParticles;
      Board.highMonocolourParticles = module.hot.data.highMonocolourParticles;
      Board.highTexturedParticles = module.hot.data.highTexturedParticles;
      Board.tickCallbacks = module.hot.data.tickCallbacks;
   }
}