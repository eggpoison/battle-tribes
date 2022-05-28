import { generateTerrain, TileType } from "./terrain-generation";
import { getCanvasContext, getCanvasHeight, getCanvasWidth } from "./components/Canvas";
import { updateDevtools } from "./components/Devtools";
import InventoryViewerManager from "./components/inventory/InventoryViewerManager";
import Player from "./entities/tribe-members/Player";
import Entity from "./entities/Entity";
import RenderComponent from "./entity-components/RenderComponent";
import TransformComponent from "./entity-components/TransformComponent";
import SETTINGS from "./settings";
import { precomputeTileLocations } from "./tile-types";
import Tribe from "./Tribe";
import { Point } from "./utils";
import Camera from "./Camera";
import Mob from "./entities/mobs/Mob";
import HitboxComponent from "./entity-components/HitboxComponent";
import OPTIONS from "./options";
import InfiniteInventoryComponent from "./entity-components/inventory/InfiniteInventoryComponent";
import Game from "./Game";
import EntitySpawner from "./EntitySpawner";
import Resource from "./entities/resources/Resource";

export type Chunk = Array<Entity>;

export type Coordinates = [number, number];

abstract class Board {
   /** The width and height of the board in chunks */
   public static size: number = 16;
   /** The width and height of a chunk in cells */
   public static chunkSize: number = 8;
   /** By default how large the tiles are in pixels */
   public static tileSize: number = 60;

   public static dimensions = this.size * this.chunkSize;

   /** Each chunk contains an array of entities */
   private static chunks: Array<Array<Chunk>>;

   private static tiles: Array<Array<TileType>>;

   private static disappearingFog = new Array<Coordinates>();

   private static changedTiles = new Array<Coordinates>();

   public static setup(): void {
      this.tiles = generateTerrain();

      // Initialise the chunks array
      this.chunks = new Array<Array<Chunk>>(this.size);
      for (let x = 0; x < this.size; x++) {
         this.chunks[x] = new Array<Chunk>(this.size);
         for (let y = 0; y < this.size; y++) {
            this.chunks[x][y] = new Array<Entity>();
         }
      }

      precomputeTileLocations();


      // Spawn initial entities
      EntitySpawner.spawnInitialEntities();

      // Creates the controllable player character
      this.spawnPlayer();
   }

   public static getChangedTiles(): Array<Coordinates> {
      return this.changedTiles;
   }

   public static getTile(x: number, y: number): TileType {
      return this.tiles[x][y];
   }

   public static getChunk(x: number, y: number): Chunk | null {
      // Don't return chunks which are out of bounds
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;

      return this.chunks[x][y];
   }

   /** Clear values */
   public static clearValues(): void {
      this.changedTiles = new Array<Coordinates>();
   }

   /** Tick all entities */
   public static tick(): void {
      EntitySpawner.runSpawnAttempt();

      let entityCount = 0;
      let passiveMobCount = 0;
      let hostileMobCount = 0;
      let resourceCount = 0;

      const entitiesToChangeChunk: Array<[Entity, Chunk]> = [];

      const ctx = getCanvasContext();
      for (let y = 0; y < this.size; y++) {
         for (let x = 0; x < this.size; x++) {
            // A copy of the chunk array has to be used, as otherwise if an entity
            // dies, an entity will get skipped by the loop.
            const chunk = this.getChunk(x, y)!.slice();

            const chunkIsVisible = Camera.chunkIsVisible(x, y);

            for (const entity of chunk) {
               entityCount++;
               if (entity instanceof Mob) {
                  const behaviour = entity.entityInfo.behaviour;
                  if (behaviour === "hostile" || behaviour === "neutral") {
                     hostileMobCount++;
                  } else {
                     passiveMobCount++;
                  }
               } else if (entity instanceof Resource) {
                  resourceCount++;
               }

               if (chunkIsVisible) {
                  // Render the entity
                  const renderComponent = entity.getComponent(RenderComponent);
                  if (renderComponent !== null) {
                     renderComponent.renderEntity(ctx);
                  }

                  if (OPTIONS.showEntityHitboxes) {
                     // Draw the hitbox
                     const hitboxComponent = entity.getComponent(HitboxComponent);
                     if (hitboxComponent !== null) {
                        hitboxComponent.drawHitbox(ctx);
                     }
                  }
               }

               entity.tick();
               
               const newChunk = entity.getComponent(TransformComponent)!.getChunk()!;
               if (newChunk !== entity.previousChunk && newChunk !== null) {
                  entitiesToChangeChunk.push([entity, newChunk]);
               }
            }
         }
      }

      for (const [entity, newChunk] of entitiesToChangeChunk) {
         entity.previousChunk!.splice(entity.previousChunk!.indexOf(entity), 1);

         newChunk.push(entity);

         entity.previousChunk = newChunk;
      }

      this.updateDisappearingFog();
      
      updateDevtools({
         entityCount: entityCount,
         mobCount: hostileMobCount + passiveMobCount,
         resourceCount: resourceCount
      });

      EntitySpawner.setHostileMobCount(hostileMobCount);
      EntitySpawner.setPassiveMobCount(passiveMobCount);
   }

   public static drawDarkness(): void {
      let darkness = Game.getSkyDarkness();
      if (darkness === 0) return;

      const ctx = getCanvasContext();

      const width = getCanvasWidth();
      const height = getCanvasHeight();

      darkness *= 0.6;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.fillRect(0, 0, width, height);
   }

   private static readonly fogDiscoverLocations: { [key: number]: Array<Coordinates> } = {};

   private static calculateFogDiscoverLocations(radius: number): Array<Coordinates> {
      const minX = -Math.floor(radius);
      const maxX = Math.ceil(radius);
      const minY = -Math.floor(radius);
      const maxY = Math.ceil(radius);

      const fogDiscoverLocations = new Array<Coordinates>();

      for (let x = minX; x <= maxX; x++) {
         for (let y = minY; y <= maxY; y++) {
            if (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) <= radius) {
               fogDiscoverLocations.push([x, y]);
            }
         }
      }

      return fogDiscoverLocations;
   }

   private static updateDisappearingFog(): void {
      for (let i = this.disappearingFog.length - 1; i >= 0; i--) {
         const [x, y] = this.disappearingFog[i];
         const tile = this.getTile(x, y);

         tile.fogAmount -= 1 / SETTINGS.tps / SETTINGS.fogRevealTime;

         if (tile.fogAmount <= 0) {
            tile.fogAmount = 0;

            this.disappearingFog.splice(i, 1);
         }
      }
   }

   public static revealFog(startCoordinates: Coordinates, radius: number, isImmediate: boolean): void {
      let fogDiscoverLocations: Array<Coordinates>;

      if (this.fogDiscoverLocations.hasOwnProperty(radius)) {
         // If the fog discover locations have already been calculated, return the previously calculated values
         fogDiscoverLocations = this.fogDiscoverLocations[radius];
      } else {
         // Calculate the fog discover locations
         fogDiscoverLocations = this.calculateFogDiscoverLocations(radius);
         this.fogDiscoverLocations[radius] = fogDiscoverLocations;
      }

      const [x, y] = startCoordinates;
      for (const [offsetX, offsetY] of fogDiscoverLocations) {
         if (x + offsetX < 0 || x + offsetX >= Board.dimensions || y + offsetY < 0 || y + offsetY >= Board.dimensions) {
            continue;
         }

         const tile = this.getTile(x + offsetX, y + offsetY);

         // Reveal fog
         if (tile.fogAmount === 1) {
            if (isImmediate) {
               tile.fogAmount = 0;
               this.changedTiles.push([x + offsetX, y + offsetY]);
            } else {
               this.disappearingFog.push([x + offsetX, y + offsetY]);
            }
         }

         // Add the fog to the changed tiles
         this.changedTiles.push([x + offsetX, y + offsetY]);
      }
   }

   private static spawnPlayer(): void {
      const tribeSpawnPosition = Tribe.getPlayerTribeSpawnPosition();
      const playerTribe = new Tribe(tribeSpawnPosition, Player.TRIBE_COLOUR);

      // Link the player tribe's stash to the stash viewer
      const stash = playerTribe.stash;
      InventoryViewerManager.getInstance("tribeStash").setInventoryComponent(stash.getComponent(InfiniteInventoryComponent)!);

      const player = new Player(playerTribe);
      this.addEntity(player);
   }

   private static getEntityChunk(entity: Entity): Chunk {
      // Get the chunk
      const entityPositionComponent = entity.getComponent(TransformComponent)!;
      const chunk = entityPositionComponent.getChunk()!;
      return chunk;
   }

   public static addEntity(entity: Entity): void {
      const chunk = this.getEntityChunk(entity);

      // If the entity's spawn position is outside the board, don't add it
      if (chunk === null) return;

      if (typeof entity.onLoad !== "undefined") entity.onLoad();

      // Add the entity to the chunk
      chunk.push(entity);

      // Update the entity's previous chunk
      entity.previousChunk = chunk;
   }

   public static removeEntity(entity: Entity): void {
      // Remove the entity from its chunk
      const chunk = entity.previousChunk!;
      chunk.splice(chunk.indexOf(entity), 1);
   }

   public static getRandomPositionInTile(tileCoordinates: Coordinates): Point {
      const x = tileCoordinates[0] * Board.tileSize + Board.tileSize * Math.random();
      const y = tileCoordinates[1] * Board.tileSize + Board.tileSize * Math.random();

      return new Point(x, y);
   }

   public static getNearbyTileCoordinates(position: Point, range: number): Array<Coordinates> {
      if (!Number.isInteger(range)) throw new Error("Search radius must be an integer!");

      const tileX = Math.floor(position.x / this.tileSize);
      const tileY = Math.floor(position.y / this.tileSize);

      const minX = Math.max(tileX - range, 0);
      const maxX = Math.min(tileX + range, this.dimensions - 1);
      const minY = Math.max(tileY - range, 0);
      const maxY = Math.min(tileY + range, this.dimensions - 1);

      const nearbyTileCoordinates = new Array<Coordinates>();
      for (let y = minY; y <= maxY; y++) {
         for (let x = minX; x <= maxX; x++) {
            nearbyTileCoordinates.push([x, y]);
         }
      }

      return nearbyTileCoordinates;
   }
}

export default Board;