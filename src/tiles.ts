import Board, { TileCoordinates } from "./Board";

export enum TileType {
   grass,
   rainforest,
   mountain,
   desert,
   snow
}

interface TileInfo {
   colour: string;
   minHeight?: number;
   maxHeight?: number;
   minTemperature?: number;
   maxTemperature?: number;
   minHumidity?: number;
   maxHumidity?: number;
}

// Can't use an object cuz of stupid object ordering shenanigans.
const TILE_INFO_MAP = new Map<TileType, TileInfo>([
   [TileType.desert, {
      colour: "yellow",
      minTemperature: 0.7,
      maxHumidity: 0.3
   }],
   [TileType.snow, {
      colour: "#fff",
      maxTemperature: 0.5,
      maxHumidity: 0.3
   }],
   [TileType.rainforest, {
      colour: "#038a0c",
      minHumidity: 0.7
   }],
   [TileType.mountain, {
      colour: "#aaa",
      minHeight: 0.8
   }],
   [TileType.grass, {
      colour: "#39f746"
   }],
]);

export default TILE_INFO_MAP;

let tileLocations: Partial<Record<TileType, Array<TileCoordinates>>> = {};

export function precomputeTileLocations(): void {
   const tileTypes = Object.keys(TileType).filter((_, i, arr) => i <= arr.length / 2);
   for (const tileType of tileTypes) {
      tileLocations[tileType as unknown as TileType] = new Array<TileCoordinates>();
   }

   for (let y = 0; y < Board.dimensions; y++) {
      for (let x = 0; x < Board.dimensions; x++) {
         const tileType = Board.getTile(x, y);
         tileLocations[tileType]!.push([x, y]);
      }
   }
}

export function getTilesByType(tileTypes: ReadonlyArray<TileType>): ReadonlyArray<TileCoordinates> {
   const tileCoordinates = new Array<TileCoordinates>();

   for (const tileType of tileTypes) {
      for (const tileCoordinate of tileLocations[tileType]!) {
         tileCoordinates.push(tileCoordinate);
      }
   }

   return tileCoordinates;
}

const matchesTileRequirements = (tileInfo: TileInfo, height: number, temperature: number, humidity: number): boolean => {
   // Height
   if (typeof tileInfo.minHeight !== "undefined" && height < tileInfo.minHeight) return false;
   if (typeof tileInfo.maxHeight !== "undefined" && height > tileInfo.maxHeight) return false;
   
   // Temperature
   if (typeof tileInfo.minTemperature !== "undefined" && temperature < tileInfo.minTemperature) return false;
   if (typeof tileInfo.maxTemperature !== "undefined" && temperature > tileInfo.maxTemperature) return false;
   
   // Humidity
   if (typeof tileInfo.minHumidity !== "undefined" && humidity < tileInfo.minHumidity) return false;
   if (typeof tileInfo.maxHumidity !== "undefined" && humidity > tileInfo.maxHumidity) return false;

   return true;
}

export function getTileInfo(tileType: TileType): TileInfo {
   return TILE_INFO_MAP.get(tileType)!;
}

export function getTileType(height: number, temperature: number, humidity: number): TileType {
   const mapKeysIterator = TILE_INFO_MAP.keys();

   for (let i = 0; i < TILE_INFO_MAP.size; i++) {
      // Get tile info
      const tileName = mapKeysIterator.next().value;
      const tileInfo = TILE_INFO_MAP.get(tileName)!;

      if (matchesTileRequirements(tileInfo, height, temperature, humidity)) {
         return Number(tileName);
      }
   }

   throw new Error(`Couldn't find a tile type! Height: ${height}, temperature: ${temperature}, humidity: ${humidity}`);
}