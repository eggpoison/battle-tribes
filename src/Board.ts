import { generateTerrain } from "./terrain-generation";
import { getCanvasContext, getCanvasHeight, getCanvasWidth } from "./components/Canvas";
import { updateDevtools } from "./components/Devtools";
import InventoryViewerManager from "./components/inventory/InventoryViewerManager";
import Player from "./entities/tribe-members/Player";
import Entity from "./entities/Entity";
import RenderComponent from "./entity-components/RenderComponent";
import TransformComponent from "./entity-components/TransformComponent";
import SETTINGS from "./settings";
import { precomputeTileLocations, TileType } from "./tiles";
import Tribe from "./Tribe";
import { Point } from "./utils";
import Camera from "./Camera";
import Mob from "./entities/mobs/Mob";
import HitboxComponent from "./entity-components/HitboxComponent";
import OPTIONS from "./options";
import { Minimap } from "./components/MinimapCanvas";
import InfiniteInventoryComponent from "./entity-components/inventory/InfiniteInventoryComponent";
import Game from "./Game";
import EntitySpawner from "./EntitySpawner";
import Cow from "./entities/mobs/Cow";
import Resource from "./entities/resources/Resource";

export type Chunk = Array<Entity>;

export type TileCoordinates = [number, number];

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
   private static fog: Array<Array<number>>;

   public static setup(): void {
      this.tiles = generateTerrain();

      this.fog = this.initialiseFog();

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
      // MobSpawner.spawnInitialMobs();
      // ResourceSpawner.spawnInitialResources();

      // Creates the controllable player character
      this.spawnPlayer();
   }

   private static initialiseFog(): Array<Array<number>> {
      const fog = new Array<Array<number>>();

      for (let y = 0; y < this.size; y++) {
         fog[y] = new Array<number>();

         for (let x = 0; x < this.size; x++) {
            fog[y][x] = 1;
         }
      }

      return fog;
   }

   public static getFog(x: number, y: number): number {
      return this.fog[x][y];
   }

   public static getTileType(x: number, y: number): TileType {
      return this.tiles[x][y];
   }

   public static getChunk(x: number, y: number): Chunk | null {
      // Don't return chunks which are out of bounds
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;

      return this.chunks[x][y];
   }

   public static tick(): void {
      EntitySpawner.runSpawnAttempt();

      let entityCount = 0;
      let mobCount = 0;
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
                  mobCount++;
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
               if (newChunk !== entity.previousChunk) {
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

      this.drawDarkness(ctx);

      this.drawFog(ctx);
      
      updateDevtools({
         entityCount: entityCount,
         mobCount: mobCount,
         resourceCount: resourceCount
      });

      EntitySpawner.updateMobCount(mobCount);
   }

   private static drawDarkness(ctx: CanvasRenderingContext2D): void {
      let darkness = Game.getSkyDarkness();
      if (darkness === 0) return;

      const width = getCanvasWidth();
      const height = getCanvasHeight();

      darkness *= 0.6;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.fillRect(0, 0, width, height);
   }

   private static drawFog(ctx: CanvasRenderingContext2D): void {
      const [minX, maxX, minY, maxY] = Camera.getVisibleChunkBounds();

      for (let chunkY = minY; chunkY <= maxY; chunkY++) {
         for (let chunkX = minX; chunkX <= maxX; chunkX++) {

            // Draw fog of war
            const x1 = chunkX * this.tileSize * this.chunkSize;
            const x2 = (chunkX + 1) * this.tileSize * this.chunkSize;
            const y1 = chunkY * this.tileSize * this.chunkSize;
            const y2 = (chunkY + 1) * this.tileSize * this.chunkSize;

            const fogAmount = this.getFog(chunkX, chunkY);
            
            ctx.fillStyle = `rgba(0, 0, 0, ${fogAmount})`;
            ctx.fillRect(Camera.getXPositionInCamera(x1), Camera.getYPositionInCamera(y1), x2 - x1, y2 - y1);

            // Decrease fog amount
            if (fogAmount < 1 && fogAmount > 0) {
               this.fog[chunkX][chunkY] -= 1 / SETTINGS.tps / SETTINGS.fogRevealTime;
            }
         }
      }
   }

   public static revealFog(position: Point, radius: number, isImmediate: boolean): void {
      const minChunkX = Math.floor((position.x - radius) / Board.tileSize / Board.chunkSize);
      const maxChunkX = Math.floor((position.x + radius) / Board.tileSize / Board.chunkSize);

      const minChunkY = Math.floor((position.y - radius) / Board.tileSize / Board.chunkSize);
      const maxChunkY = Math.floor((position.y + radius) / Board.tileSize / Board.chunkSize);

      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {

            if (this.getFog(chunkX, chunkY) === 1) {
               if (isImmediate) {
                  this.fog[chunkX][chunkY] = 0;
               } else {
                  this.fog[chunkX][chunkY] -= 1 / SETTINGS.tps / SETTINGS.fogRevealTime;
               }
               
               // Update the minimap
               Minimap.drawBackground();
            }
         }
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

   public static getRandomPositionInTile(tileCoordinates: TileCoordinates): Point {
      const x = tileCoordinates[0] * Board.tileSize + Board.tileSize * Math.random();
      const y = tileCoordinates[1] * Board.tileSize + Board.tileSize * Math.random();

      return new Point(x, y);
   }

   public static getNearbyTileCoordinates(position: Point, range: number): Array<TileCoordinates> {
      if (!Number.isInteger(range)) throw new Error("Search radius must be an integer!");

      const tileX = Math.floor(position.x / this.tileSize);
      const tileY = Math.floor(position.y / this.tileSize);

      const minX = Math.max(tileX - range, 0);
      const maxX = Math.min(tileX + range, this.dimensions - 1);
      const minY = Math.max(tileY - range, 0);
      const maxY = Math.min(tileY + range, this.dimensions - 1);

      const nearbyTileCoordinates = new Array<TileCoordinates>();
      for (let y = minY; y <= maxY; y++) {
         for (let x = minX; x <= maxX; x++) {
            const tileCoordinates = [x, y];
            nearbyTileCoordinates.push(tileCoordinates as TileCoordinates);
         }
      }

      return nearbyTileCoordinates;
   }
}

export default Board;