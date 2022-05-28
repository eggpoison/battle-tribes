import Board, { Coordinates } from "./Board";

export enum TileKind {
   dirt,
   grass,
   sludge,
   rock,
   sand,
   sandstone,
   snow,
   ice,
   magma,
   lava
}

type TileEffects = {
   readonly moveSpeedMultiplier?: number;
   readonly walkDamage?: number;
}

interface TileInfo {
   readonly colour: string;
   /** How quickly an entity loses acceleration on the tile (1 = instant, 0 = maintains) */
   readonly friction: number;
   readonly effects?: TileEffects;
   readonly isLiquid?: boolean;
}

const DEFAULT_FRICTION = 0.5;

const TILE_INFO: Record<TileKind, TileInfo> = {
   [TileKind.dirt]: {
      colour: "#784e16",
      friction: DEFAULT_FRICTION
   },
   [TileKind.grass]: {
      colour: "#39f746",
      friction: DEFAULT_FRICTION
   },
   [TileKind.rock]: {
      colour: "#aaaaaa",
      friction: DEFAULT_FRICTION
   },
   [TileKind.sand]: {
      colour: "#eded3e",
      friction: DEFAULT_FRICTION
   },
   [TileKind.sandstone]: {
      colour: "#abab1b",
      friction: DEFAULT_FRICTION
   },
   [TileKind.snow]: {
      colour: "#ffffff",
      friction: DEFAULT_FRICTION,
      effects: {
         moveSpeedMultiplier: 0.7
      }
   },
   [TileKind.ice]: {
      colour: "#94f6ff",
      friction: 0.1,
      effects: {
         moveSpeedMultiplier: 1.2
      }
   },
   [TileKind.sludge]: {
      colour: "#038a0c",
      friction: 0.8,
      effects: {
         moveSpeedMultiplier: 0.5
      }
   },
   [TileKind.magma]: {
      colour: "#ff9f0f",
      friction: DEFAULT_FRICTION,
      effects: {
         walkDamage: 1
      }
   },
   [TileKind.lava]: {
      colour: "#ff130f",
      friction: 1,
      effects: {
         moveSpeedMultiplier: 0.6,
         walkDamage: 5
      },
      isLiquid: true
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