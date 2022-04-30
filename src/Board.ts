import { generateBoard } from "./board-generation";
import { getCanvasContext } from "./components/Canvas";
import { updateDevtools } from "./components/Devtools";
import InventoryViewerManager from "./components/InventoryViewerManager";
import Berry from "./entities/Berry";
import Cow from "./entities/Cow";
import Player from "./entities/Player";
import Entity from "./Entity";
import InventoryComponent from "./entity-components/InventoryComponent";
import RenderComponent from "./entity-components/RenderComponent";
import TransformComponent from "./entity-components/TransformComponent";
import SETTINGS from "./settings";
import { TileType } from "./tiles";
import Tribe from "./Tribe";
import { Point } from "./utils";

export type Chunk = Array<Entity>;

export type TileCoordinates = [number, number];

abstract class Board {
   /** The width and height of the board in chunks */
   public static size: number = 8;
   /** The width and height of a chunk in cells */
   public static chunkSize: number = 8;
   /** By default how large the tiles are in pixels */
   public static tileSize: number = 60;

   public static dimensions = this.size * this.chunkSize;

   /** Each chunk contains an array of entities */
   private static chunks: Array<Array<Chunk>>;

   private static tiles: Array<Array<TileType>>;

   public static setup(): void {
      this.tiles = generateBoard(this.dimensions);

      // Initialise the chunks array
      this.chunks = new Array<Array<Chunk>>(this.size);
      for (let x = 0; x < this.size; x++) {
         this.chunks[x] = new Array<Chunk>(this.size);
         for (let y = 0; y < this.size; y++) {
            this.chunks[x][y] = new Array<Entity>();
         }
      }

      // Creates the controllable player character
      this.spawnPlayer();
   }

   public static getTile(x: number, y: number): TileType {
      return this.tiles[x][y];
   }

   public static getChunk(x: number, y: number): Chunk | null {
      // Don't return chunks which are out of bounds
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;

      return this.chunks[x][y];
   }

   public static tick(): void {
      // Calculate berry spawn rate
      const ununitisedBerrySpawnRate = SETTINGS.fruitSpawnRate / SETTINGS.tps;
      const berrySpawnRate = Math.floor(ununitisedBerrySpawnRate) + (Math.random() < ununitisedBerrySpawnRate % 1 ? 1 : 0);

      // Spawn berries
      for (let i = 0; i < berrySpawnRate; i++) {
         const berry = new Berry();
         this.addEntity(berry);
      }
      // Calculate berry spawn rate
      const ununitisedCowSpawnRate = Cow.SPAWN_RATE / SETTINGS.tps;
      const cowSpawnRate = Math.floor(ununitisedCowSpawnRate) + (Math.random() < ununitisedCowSpawnRate % 1 ? 1 : 0);

      // Spawn berries
      for (let i = 0; i < cowSpawnRate; i++) {
         const cow = new Cow();
         this.addEntity(cow);
      }

      let entityCount = 0;

      // Tick entities
      const ctx = getCanvasContext();
      for (let y = 0; y < Board.size; y++) {
         for (let x = 0; x < Board.size; x++) {
            const chunk = this.getChunk(x, y)!;

            for (const entity of chunk) {
               entityCount++;
               
               // Render the entity
               // If rendered after the entity is ticked, then its position will not match where the camera thinks it is
               if (entity.hasComponent(RenderComponent)) {
                  entity.getComponent(RenderComponent)!.renderEntity(ctx);
               }

               entity.tick();
               this.upateEntityChunk(entity);
            }
         }
      }
      
      updateDevtools({
         entityCount: entityCount
      });
   }

   private static spawnPlayer(): void {
      const tribeSpawnPosition = Tribe.getPlayerTribeSpawnPosition();
      const playerTribe = new Tribe(tribeSpawnPosition);

      // Link the player tribe's stash to the stash viewer
      const stash = playerTribe.stash;
      InventoryViewerManager.getInstance("tribeStash").setInventoryComponent(stash.getComponent(InventoryComponent)!);

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

   public static upateEntityChunk(entity: Entity): void {
      const chunk = this.getEntityChunk(entity);

      // If the chunk is different from the entity's previous chunk
      if (chunk !== entity.previousChunk) {
         // Remove it from its previous chunk
         entity.previousChunk!.splice(entity.previousChunk!.indexOf(entity), 1);
         // Add it to the new chunk
         chunk.push(entity);

         entity.previousChunk = chunk;
      }
   }

   public static getRandomPositionInTile(tileCoordinates: TileCoordinates): Point {
      const x = tileCoordinates[0] * Board.tileSize + Board.tileSize * Math.random();
      const y = tileCoordinates[1] * Board.tileSize + Board.tileSize * Math.random();

      return new Point(x, y);
   }
}

export default Board;