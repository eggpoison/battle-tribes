export enum TileType {
   grass,
   rainforest,
   desert,
   tundra
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
   [TileType.tundra, {
      colour: "#98e5ed",
      maxTemperature: 0.5,
      maxHumidity: 0.3
   }],
   [TileType.rainforest, {
      colour: "#038a0c",
      minTemperature: 0.5,
      minHumidity: 0.7
   }],
   [TileType.grass, {
      colour: "#39f746"
   }],
]);

export default TILE_INFO_MAP;

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