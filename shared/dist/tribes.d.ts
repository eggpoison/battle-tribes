import { Biome } from "./tiles";
export declare enum TribeType {
    plainspeople = 0,
    barbarians = 1,
    frostlings = 2,
    goblins = 3
}
interface TribeInfo {
    readonly maxHealthPlayer: number;
    readonly maxHealthWorker: number;
    readonly biomes: ReadonlyArray<Biome>;
    readonly baseTribesmanCap: number;
    readonly moveSpeedMultiplier: number;
}
export declare const TRIBE_INFO_RECORD: Record<TribeType, TribeInfo>;
export {};
