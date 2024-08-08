import { Settings } from "webgl-test-shared/dist/settings";
import { GrassTileInfo, RIVER_STEPPING_STONE_SIZES, RiverFlowDirectionsRecord, RiverSteppingStoneData, ServerTileUpdateData } from "webgl-test-shared/dist/client-server-types";
import { TileType } from "webgl-test-shared/dist/tiles";
import { Point, Vector } from "webgl-test-shared/dist/utils";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import Chunk from "./Chunk";
import { Tile } from "./Tile";
import Entity from "./Entity";
import Particle from "./Particle";
import { highMonocolourBufferContainer, highTexturedBufferContainer, lowMonocolourBufferContainer, lowTexturedBufferContainer } from "./rendering/webgl/particle-rendering";
import ObjectBufferContainer from "./rendering/ObjectBufferContainer";
import { tempFloat32ArrayLength1 } from "./webgl";
import Player from "./entities/Player";
import { NEIGHBOUR_OFFSETS } from "./utils";
import { RenderableType, addRenderable, removeRenderable } from "./rendering/render-loop";
import { WorldInfo } from "webgl-test-shared/dist/structures";
import { EntityInfo } from "webgl-test-shared/dist/board-interface";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import Client from "./client/Client";
import { RenderPart } from "./render-parts/render-parts";
import { InitialGameDataPacket } from "./client/packet-processing";
import { collide } from "./collision";
import { COLLISION_BITS } from "webgl-test-shared/dist/collision";
import { latencyGameState } from "./game-state/game-states";
import { addEntityToRenderHeightMap, removeEntityFromBuffer } from "./rendering/webgl/entity-rendering";
import { getComponentArrays } from "./entity-components/ComponentArray";

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

   // @Hack: don't have this default value
   private static tiles: ReadonlyArray<Tile>;
   private static chunks: Array<Chunk>;
   
   public static grassInfo: Record<number, Record<number, GrassTileInfo>>;
   private static riverFlowDirections: RiverFlowDirectionsRecord;

   public static numVisibleRenderParts = 0;

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

   private static tickCallbacks = new Array<TickCallback>();

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
      this.entities.add(entity);

      if (entity.type === EntityType.player) {
         this.players.push(entity as Player);
      }

      addEntityToRenderHeightMap(entity);
      addRenderable(RenderableType.entity, entity);
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

      for (let i = 0; i < entity.components.length; i++) {
         const component = entity.components[i];
         if (typeof component.onRemove !== "undefined") {
            component.onRemove();
         }
      }
   
      this.entities.delete(entity);

      removeRenderable(entity);
      removeEntityFromBuffer(entity);
   
      this.numVisibleRenderParts -= entity.allRenderParts.length;
   }

   public static resolvePlayerCollisions(): void {
      const player = Player.instance!;
      const transformComponent = player.getServerComponent(ServerComponentType.transform);

      for (const chunk of transformComponent.chunks) {
         // @Cleanup: Copy and paste
         for (const entityID of chunk.entities) {
               // @Speed
               if (entityID === player.id) {
                  continue;
               }

               const entity = Board.entityRecord[entityID]!;
               const otherTransformComponent = entity.getServerComponent(ServerComponentType.transform);

               for (const hitbox of transformComponent.hitboxes) {
                  for (const otherHitbox of otherTransformComponent.hitboxes) {
                     if (hitbox.isColliding(otherHitbox)) {
                        if (!transformComponent.collidingEntities.includes(entity)) {
                           transformComponent.collidingEntities.push(entity);
                        }
                        
                        if ((otherTransformComponent.collisionMask & transformComponent.collisionBit) !== 0 && (transformComponent.collisionMask & otherTransformComponent.collisionBit) !== 0) {
                           collide(player, entity, hitbox, otherHitbox);
                           collide(entity, player, otherHitbox, hitbox);
                        } else {
                           // @Hack
                           if (otherTransformComponent.collisionBit === COLLISION_BITS.plants) {
                              latencyGameState.lastPlantCollisionTicks = Board.serverTicks;
                           }
                           break;
                        }
                     }
                  }
               }
               // const collisionNum = entitiesAreColliding(entity1ID, entity2ID);
               // if (collisionNum !== CollisionVars.NO_COLLISION) {
               //    collisionPairs.push({
               //       entity1: entity1ID,
               //       entity2: entity2ID,
               //       collisionNum: collisionNum
               //    });
               // }
         }
      }
   }

   public static resolveEntityCollisions(): void {
      const numChunks = Settings.BOARD_SIZE * Settings.BOARD_SIZE;
      for (let i = 0; i < numChunks; i++) {
         const chunk = this.chunks[i];

         // @Speed: physics-physics comparisons happen twice
         // For all physics entities, check for collisions with all other entities in the chunk
         for (let j = 0; j < chunk.physicsEntities.length; j++) {
            const entity1ID = chunk.physicsEntities[j];
            const entity1 = this.entityRecord[entity1ID]!;

            const transformComponent = entity1.getServerComponent(ServerComponentType.transform);
            
            for (let k = 0; k < chunk.entities.length; k++) {
               const entity2ID = chunk.entities[k];
               // @Speed
               if (entity1ID === entity2ID) {
                  continue;
               }

               const entity2 = this.entityRecord[entity2ID]!;
               const otherTransformComponent = entity2.getServerComponent(ServerComponentType.transform);

               for (const hitbox of transformComponent.hitboxes) {
                  for (const otherHitbox of otherTransformComponent.hitboxes) {
                     if (hitbox.isColliding(otherHitbox)) {
                        if (!transformComponent.collidingEntities.includes(entity2)) {
                           transformComponent.collidingEntities.push(entity2);
                        }
                        
                        if ((otherTransformComponent.collisionMask & transformComponent.collisionBit) !== 0 && (transformComponent.collisionMask & otherTransformComponent.collisionBit) !== 0) {
                           collide(entity1, entity2, hitbox, otherHitbox);
                           collide(entity2, entity1, otherHitbox, hitbox);
                        } else {
                           // @Hack
                           if (otherTransformComponent.collisionBit === COLLISION_BITS.plants) {
                              latencyGameState.lastPlantCollisionTicks = Board.serverTicks;
                           }
                           break;
                        }
                     }
                  }
               }
               // const collisionNum = entitiesAreColliding(entity1ID, entity2ID);
               // if (collisionNum !== CollisionVars.NO_COLLISION) {
               //    collisionPairs.push({
               //       entity1: entity1ID,
               //       entity2: entity2ID,
               //       collisionNum: collisionNum
               //    });
               // }
            }
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
            for (let j = 0; j < componentArray.components.length; j++) {
               const component = componentArray.components[j];
               // @Temporary @Hack
               componentArray.onTick(component, 0);
            }
         }
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