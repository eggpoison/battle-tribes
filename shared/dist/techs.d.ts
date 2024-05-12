import { ItemRequirements } from "./crafting-recipes";
import { ItemType } from "./items";
import { TribeType } from "./tribes";
export declare enum TechID {
    fire = 0,
    society = 1,
    gathering = 2,
    stoneTools = 3,
    furnace = 4,
    woodworking = 5,
    throngling = 6,
    archery = 7,
    reinforcedBows = 8,
    crossbows = 9,
    iceBows = 10,
    warmongering = 11,
    leatherworking = 12,
    warriors = 13,
    basicArchitecture = 14,
    storage = 15,
    frostshaping = 16,
    basicMachinery = 17,
    herbalMedicine = 18,
    planterBox = 19,
    healingTotem = 20
}
interface TechUnlockProgress {
    readonly itemProgress: ItemRequirements;
    studyProgress: number;
}
/** The current amount of items used in each tech's research */
export type TechTreeUnlockProgress = Partial<Record<TechID, TechUnlockProgress>>;
export interface TribeData {
    readonly name: string;
    readonly id: number;
    readonly tribeType: TribeType;
}
export interface PlayerTribeData extends TribeData {
    readonly hasTotem: boolean;
    readonly numHuts: number;
    readonly tribesmanCap: number;
    readonly area: ReadonlyArray<[tileX: number, tileY: number]>;
    readonly selectedTechID: TechID | null;
    readonly unlockedTechs: ReadonlyArray<TechID>;
    readonly techTreeUnlockProgress: TechTreeUnlockProgress;
}
export interface EnemyTribeData extends TribeData {
}
export interface TechInfo {
    readonly id: TechID;
    readonly name: string;
    readonly description: string;
    readonly iconSrc: string;
    readonly unlockedItems: ReadonlyArray<ItemType>;
    readonly positionX: number;
    readonly positionY: number;
    readonly dependencies: ReadonlyArray<TechID>;
    readonly researchItemRequirements: ItemRequirements;
    readonly researchStudyRequirements: number;
    /** Tribes which are unable to research the tech */
    readonly blacklistedTribes: ReadonlyArray<TribeType>;
    readonly conflictingTechs: ReadonlyArray<TechID>;
}
export declare const TECHS: ReadonlyArray<TechInfo>;
export declare function getTechByID(techID: TechID): TechInfo;
export declare function getTechRequiredForItem(itemType: ItemType): TechID | null;
/** Returns all techs required to get to the item type, in ascending order of depth */
export declare function getTechChain(itemType: ItemType): ReadonlyArray<TechInfo>;
export {};
