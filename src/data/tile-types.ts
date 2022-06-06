import Board, { Coordinates } from "../Board";
import { ParticleInfoType } from "../particles/Particle";
import { StatusEffectType } from "./status-effects";
import { Point3, randFloat, randItem } from "../utils";

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
   readonly statusEffectOnWalk?: {
      readonly type: StatusEffectType;
      readonly duration: number;
   }
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
         walkDamage: 1,
         statusEffectOnWalk: {
            type: "fire",
            duration: 1
         }
      }
   },
   [TileKind.lava]: {
      colour: "#ff130f",
      friction: 1,
      effects: {
         moveSpeedMultiplier: 0.6,
         walkDamage: 5,
         statusEffectOnWalk: {
            type: "fire",
            duration: 5
         }
      },
      isLiquid: true
   }
};
export default TILE_INFO;

type TileParticleInfo = {
   /** The average number of particles produced by the tile every second */
   readonly spawnChance: number;
   readonly amount?: number | [number, number];
   readonly particleInfo: ParticleInfoType;
}
export const TILE_PARTICLES: Partial<Record<TileKind, TileParticleInfo>> = {
   [TileKind.lava]: {
      spawnChance: 0.05,
      amount: [2, 3],
      particleInfo: {
         type: "rectangle",
         size: [7.5, 12.5],
         colour: () => {
            const COLOURS: Array<[number, number, number]> = [
               [255, 147, 38], // Orange magma
               [252, 216, 149], // White hot magma
               [105, 0, 0] // Black rock
            ];

            return randItem(COLOURS);
         },
         initialVelocity: () => {
            const SPREAD_RANGE = 2;
            const xVel = randFloat(-SPREAD_RANGE, SPREAD_RANGE);
            const yVel = randFloat(-SPREAD_RANGE, SPREAD_RANGE);
            const zVel = randFloat(1, 3.5);
            
            return new Point3(xVel, yVel, zVel).convertToVector();
         },
         lifespan: [2, 3],
         friction: 0.5,
         shadowOpacity: 0.3,
         endOpacity: 0,
         doesBounce: false
      }
   }
}

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