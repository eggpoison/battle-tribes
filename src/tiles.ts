import Board, { TileCoordinates } from "./Board";
import { MAPS, MapType, TileGenerationInfo } from "./terrain-generation";

export enum TileType {
   grass,
   sludge,
   mountain,
   desert,
   snow,
   mud
}

type TileEffects = {
   readonly moveSpeedMultiplier?: number;
}

interface TileInfo {
   readonly colour: string;
   readonly effects?: TileEffects;
}

// Can't use an object cuz of stupid object ordering shenanigans.
const TILE_INFO_MAP = new Map<TileType, TileInfo>([
   [TileType.mountain, {
      colour: "#aaaaaa"
   }],
   [TileType.desert, {
      colour: "#ffff00"
   }],
   [TileType.snow, {
      colour: "#ffffff",
      effects: {
         moveSpeedMultiplier: 0.6
      }
   }],
   [TileType.sludge, {
      colour: "#038a0c"
   }],
   [TileType.mud, {
      colour: "#544600",
      effects: {
         moveSpeedMultiplier: 0.4
      }
   }],
   [TileType.grass, {
      colour: "#39f746"
   }]
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
         const tileType = Board.getTileType(x, y);
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

const matchesTileRequirements = (generationInfo: TileGenerationInfo, height: number, temperature: number, humidity: number): boolean => {
   // Height
   if (typeof generationInfo.minHeight !== "undefined" && height < generationInfo.minHeight) return false;
   if (typeof generationInfo.maxHeight !== "undefined" && height > generationInfo.maxHeight) return false;
   
   // Temperature
   if (typeof generationInfo.minTemperature !== "undefined" && temperature < generationInfo.minTemperature) return false;
   if (typeof generationInfo.maxTemperature !== "undefined" && temperature > generationInfo.maxTemperature) return false;
   
   // Humidity
   if (typeof generationInfo.minHumidity !== "undefined" && humidity < generationInfo.minHumidity) return false;
   if (typeof generationInfo.maxHumidity !== "undefined" && humidity > generationInfo.maxHumidity) return false;

   return true;
}

export function getTileInfo(tileType: TileType): TileInfo {
   return TILE_INFO_MAP.get(tileType)!;
}

export function getTileType(map: MapType, height: number, temperature: number, humidity: number): TileType {
   for (const generationInfo of MAPS[map].tileGeneration) {
      if (matchesTileRequirements(generationInfo, height, temperature, humidity)) {
         return Number(generationInfo.tileType);
      }
   }

   throw new Error(`Couldn't find a tile type! Height: ${height}, temperature: ${temperature}, humidity: ${humidity}`);
}

export function getTileDistFromCenter(x: number, y: number): number {
   const middleOfBoard = Board.dimensions / 2 - 0.5;
   const maxDist = Math.sqrt(Math.pow(Board.dimensions / 2, 2) + Math.pow(Board.dimensions / 2, 2));

   return Math.sqrt(Math.pow(x - middleOfBoard, 2) + Math.pow(y - middleOfBoard, 2)) / maxDist;
}