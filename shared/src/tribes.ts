import { Biome } from "./biomes";

export enum TribeType {
   plainspeople,
   barbarians,
   frostlings,
   goblins,
   dwarves
}

interface TribeInfo {
   readonly maxHealthPlayer: number;
   readonly maxHealthWorker: number;
   // @Cleanup: Client doesn't need to know this
   readonly biomes: ReadonlyArray<Biome>;
   readonly baseTribesmanCap: number;
   readonly moveSpeedMultiplier: number;
}

export const TRIBE_INFO_RECORD: Record<TribeType, TribeInfo> = {
   [TribeType.plainspeople]: {
      maxHealthPlayer: 20,
      maxHealthWorker: 14,
      biomes: [Biome.grasslands],
      baseTribesmanCap: 4,
      moveSpeedMultiplier: 1
   },
   [TribeType.barbarians]: {
      maxHealthPlayer: 25,
      maxHealthWorker: 18,
      biomes: [Biome.desert],
      baseTribesmanCap: 2,
      moveSpeedMultiplier: 0.8
   },
   [TribeType.frostlings]: {
      maxHealthPlayer: 20,
      maxHealthWorker: 14,
      biomes: [Biome.tundra],
      baseTribesmanCap: 4,
      moveSpeedMultiplier: 1
   },
   [TribeType.goblins]: {
      maxHealthPlayer: 15,
      maxHealthWorker: 10,
      biomes: [Biome.grasslands, Biome.desert, Biome.tundra],
      baseTribesmanCap: 8,
      moveSpeedMultiplier: 1
   },
   [TribeType.dwarves]: {
      maxHealthPlayer: 20,
      maxHealthWorker: 14,
      biomes: [Biome.caves],
      baseTribesmanCap: 4,
      moveSpeedMultiplier: 0.9
   }
};

export const NUM_TRIBE_TYPES = Object.keys(TRIBE_INFO_RECORD).length;