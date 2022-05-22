import Board, { Coordinates } from "./Board";

export enum TileKind {
   dirt,
   grass,
   sludge,
   rock,
   sand,
   sandstone,
   snow,
   ice
}

type TileEffects = {
   readonly moveSpeedMultiplier?: number;
}

interface TileInfo {
   readonly colour: string;
   readonly effects?: TileEffects;
}

const TILE_INFO: Record<TileKind, TileInfo> = {
   [TileKind.dirt]: {
      colour: "#784e16"
   },
   [TileKind.grass]: {
      colour: "#39f746"
   },
   [TileKind.rock]: {
      colour: "#aaaaaa"
   },
   [TileKind.sand]: {
      colour: "#eded3e"
   },
   [TileKind.sandstone]: {
      colour: "#8c8c23"
   },
   [TileKind.snow]: {
      colour: "#ffffff",
      effects: {
         moveSpeedMultiplier: 0.7
      }
   },
   [TileKind.ice]: {
      colour: "#94f6ff"
   },
   [TileKind.sludge]: {
      colour: "#038a0c",
      effects: {
         moveSpeedMultiplier: 0.5
      }
   }
};
export default TILE_INFO;

const tileLocations: Partial<Record<TileKind, Array<Coordinates>>> = {};
export function precomputeTileLocations(): void {
   const tileTypes = Object.keys(TileKind).filter((_, i, arr) => i <= arr.length / 2);
   for (const tileType of tileTypes) {
      tileLocations[tileType as unknown as TileKind] = new Array<Coordinates>();
   }

   for (let y = 0; y < Board.dimensions; y++) {
      for (let x = 0; x < Board.dimensions; x++) {
         const tile = Board.getTile(x, y);
         tileLocations[tile.kind]!.push([x, y]);
      }
   }
}

export function getTilesByType(tileTypes: ReadonlyArray<TileKind>): ReadonlyArray<Coordinates> {
   const tileCoordinates = new Array<Coordinates>();

   for (const tileType of tileTypes) {
      for (const tileCoordinate of tileLocations[tileType]!) {
         tileCoordinates.push(tileCoordinate);
      }
   }

   return tileCoordinates;
}