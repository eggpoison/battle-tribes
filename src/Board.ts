import { getCanvasContext } from "./components/Canvas";
import Berry from "./entities/Berry";
import Player from "./entities/Player";
import Entity from "./Entity";
import RenderComponent from "./entity-components/RenderComponent";
import SpawnComponent from "./entity-components/SpawnComponent";
import TransformComponent from "./entity-components/TransformComponent";
import { generatePerlinNoise } from "./perlin-noise";
import SETTINGS from "./settings";
import { getTileType, TileType } from "./tiles";
import { chooseRandomItems } from "./utils";

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
      this.tiles = this.generateTiles();

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

   private static generateTiles(): Array<Array<TileType>> {
      const HEIGHT_SCALE = 5;
      const TEMPERATURE_SCALE = 35;
      const HUMIDITY_SCALE = 10;

      // Generate the noise
      const heightMap = generatePerlinNoise(this.dimensions, this.dimensions, HEIGHT_SCALE);
      const temperatureMap = generatePerlinNoise(this.dimensions, this.dimensions, TEMPERATURE_SCALE);
      const humidityMap = generatePerlinNoise(this.dimensions, this.dimensions, HUMIDITY_SCALE);

      // Initialise the tiles array
      const tiles = new Array<Array<TileType>>(this.dimensions);
      for (let x = 0; x < this.dimensions; x++) {
         tiles[x] = new Array<TileType>(this.dimensions);

         // Fill the tile array using the noise
         for (let y = 0; y < this.dimensions; y++) {
            const height = heightMap[x][y];
            const temperature = temperatureMap[x][y];
            const humidity = humidityMap[x][y];

            const tileType = getTileType(height, temperature, humidity);
            tiles[x][y] = tileType;
         }
      }

      return tiles;
   }

   public static getTile(x: number, y: number): TileType {
      return this.tiles[x][y];
   }

   public static getChunk(x: number, y: number): Chunk {
      return this.chunks[x][y];
   }

   public static tick(): void {
      // Calculate berry spawn rate
      const ununitisedBerrySpawnRate = SETTINGS.fruitSpawnRate / SETTINGS.tps;
      const berrySpawnRate = Math.floor(ununitisedBerrySpawnRate) + (Math.random() < ununitisedBerrySpawnRate % 1 ? 1 : 0);

      // Spawn berries
      const berrySpawnTileCandidates = SpawnComponent.getSpawnableTiles("berry", Berry.spawnableTileTypes);
      const berrySpawnTileCoordinates = chooseRandomItems(berrySpawnTileCandidates, berrySpawnRate);

      for (const tileCoordinates of berrySpawnTileCoordinates) {
         const position = TransformComponent.getRandomPositionInTile(tileCoordinates);

         const berry = new Berry(position);
         this.addEntity(berry);
      }

      // Tick entities
      const ctx = getCanvasContext();
      for (let y = 0; y < Board.size; y++) {
         for (let x = 0; x < Board.size; x++) {
            const chunk = this.getChunk(x, y);

            for (const entity of chunk) {
               // Render the entity
               // If rendered after the entity is ticked, then its position will not match where the camera thinks it is
               if (entity.hasComponent(RenderComponent)) {
                  entity.getComponent(RenderComponent).renderEntity(ctx);
               }

               entity.tick();
            }
         }
      }
   }

   private static spawnPlayer(): void {
      const player = new Player();
      this.addEntity(player);
   }

   public static addEntity(entity: Entity): void {
      // Get the chunk
      const entityPositionComponent = entity.getComponent(TransformComponent);
      const entityChunk = entityPositionComponent.getChunk();

      // Add the entity to the chunk
      entityChunk.push(entity);
   }
}

export default Board;