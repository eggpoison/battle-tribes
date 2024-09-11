import { TechID, TechTreeUnlockProgress } from "battletribes-shared/techs";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";

/** Stores information about the player's tribe */
class Tribe {
   public readonly name: string;
   public readonly id: number;
   public readonly tribeType: TribeType;
   
   public hasTotem = false;
   public numHuts: number;

   public tribesmanCap: number;

   public selectedTechID: TechID | null = null;
   public unlockedTechs: ReadonlyArray<TechID> = new Array<TechID>();
   public techTreeUnlockProgress: TechTreeUnlockProgress = {};

   constructor(name: string, id: number, tribeType: TribeType, numHuts: number) {
      this.name = name;
      this.id = id;
      this.tribeType = tribeType;
      
      const tribeInfo = TRIBE_INFO_RECORD[tribeType];
      this.tribesmanCap = tribeInfo.baseTribesmanCap;
      
      this.numHuts = numHuts;
   }

   public hasUnlockedTech(tech: TechID): boolean {
      return this.unlockedTechs.includes(tech);
   }
}

export default Tribe;