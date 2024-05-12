import { TechID, TechTreeUnlockProgress } from "webgl-test-shared/dist/techs";
import { TribeType } from "webgl-test-shared/dist/tribes";
/** Stores information about the player's tribe */
declare class Tribe {
    readonly name: string;
    readonly id: number;
    readonly tribeType: TribeType;
    hasTotem: boolean;
    numHuts: number;
    tribesmanCap: number;
    selectedTechID: TechID | null;
    unlockedTechs: ReadonlyArray<TechID>;
    techTreeUnlockProgress: TechTreeUnlockProgress;
    constructor(name: string, id: number, tribeType: TribeType, numHuts: number);
    hasUnlockedTech(tech: TechID): boolean;
}
export default Tribe;
