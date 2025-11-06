import { TribeType, getTechByID, Tech, TechID, TechTreeUnlockProgress, PacketReader, ItemType, Entity, EntityType, ItemRequirements } from "webgl-test-shared";
import { techTreeState } from "../ui-state/tech-tree-state.svelte";
import { playHeadSound } from "./sound";

export interface TribesmanInfo {
   readonly entity: Entity;
   readonly entityType: EntityType;
   readonly name: string;
}

export interface ShortTribe {
   readonly name: string;
   readonly id: number;
   readonly tribeType: TribeType;
}

export interface ExtendedTribe extends ShortTribe {
   readonly hasTotem: boolean;
   readonly numHuts: number;
   readonly tribesmanCap: number;
   readonly area: ReadonlyArray<[tileX: number, tileY: number]>;
   readonly selectedTech: Tech | null;
   readonly unlockedTechs: ReadonlyArray<Tech>;
   readonly techTreeUnlockProgress: TechTreeUnlockProgress;
   readonly tribesmen: ReadonlyArray<TribesmanInfo>;
}

export type Tribe = ExtendedTribe | ShortTribe;

export let playerTribe: ExtendedTribe;
export const tribes = new Array<Tribe>();

export function tribeHasExtendedInfo(tribe: Tribe): tribe is ExtendedTribe {
   return typeof (tribe as ExtendedTribe).tribesmen !== "undefined";
}

export function updatePlayerTribe(tribe: ExtendedTribe): void {
   // @Hack: the check for undefined
   if (typeof playerTribe !== "undefined" && tribe.unlockedTechs.length > playerTribe.unlockedTechs.length) {
      playHeadSound("research.mp3", 0.4, 1);
   }

   // @Garbage
   playerTribe = tribe;

   techTreeState.updateFromTribe(tribe);
}

export function getTribeByID(tribeID: number): Tribe {
   for (const tribe of tribes) {
      if (tribe.id === tribeID) {
         return tribe;
      }
   }
   throw new Error("No tribe data for tribe with ID " + tribeID);
}

export function tribeExists(tribeID: number): boolean {
   for (const tribe of tribes) {
      if (tribe.id === tribeID) {
         return true;
      }
   }
   return false;
}

export function readShortTribeData(reader: PacketReader): ShortTribe {
   const tribeName = reader.readString();
   const tribeID = reader.readNumber();
   const tribeType = reader.readNumber();

   return {
      name: tribeName,
      id: tribeID,
      tribeType: tribeType
   };
}

export function readExtendedTribeData(reader: PacketReader): ExtendedTribe {
   const tribeName = reader.readString();
   const tribeID = reader.readNumber();
   const tribeType = reader.readNumber();

   const hasTotem = reader.readBool();
   const numHuts = reader.readNumber();
   const tribesmanCap = reader.readNumber();

   const area = new Array<[tileX: number, tileY: number]>();
   const areaLength = reader.readNumber();
   for (let i = 0; i < areaLength; i++) {
      const tileX = reader.readNumber();
      const tileY = reader.readNumber();
      area.push([tileX, tileY]);
   }

   const rawSelectedTechID = reader.readNumber();
   const selectedTech = rawSelectedTechID !== -1 ? getTechByID(rawSelectedTechID) : null;

   const unlockedTechs = new Array<Tech>();
   const numUnlockedTechs = reader.readNumber();
   for (let i = 0; i < numUnlockedTechs; i++) {
      const techID = reader.readNumber();
      unlockedTechs.push(getTechByID(techID));
   }

   // Tech tree unlock progress
   const techTreeUnlockProgress: TechTreeUnlockProgress = {};
   const numTechProgressEntries = reader.readNumber();
   for (let i = 0; i < numTechProgressEntries; i++) {
      const techID = reader.readNumber() as TechID;

      const itemProgress: ItemRequirements = {};
      const numRequirements = reader.readNumber();
      for (let j = 0; j < numRequirements; j++) {
         const itemType = reader.readNumber() as ItemType;
         const amount = reader.readNumber();
         itemProgress[itemType] = amount;
      }

      const studyProgress = reader.readNumber();

      techTreeUnlockProgress[techID] = {
         itemProgress: itemProgress,
         studyProgress: studyProgress
      };
   }

   const tribesmen = new Array<TribesmanInfo>();
   const numTribesmen = reader.readNumber();
   for (let i = 0; i < numTribesmen; i++) {
      const entity = reader.readNumber() as Entity;
      const entityType = reader.readNumber() as EntityType;
      const name = reader.readString();

      const tribesman: TribesmanInfo = {
         entity: entity,
         entityType: entityType,
         name: name
      };
      tribesmen.push(tribesman);
   }

   return  {
      name: tribeName,
      id: tribeID,
      tribeType: tribeType,
      hasTotem: hasTotem,
      numHuts: numHuts,
      tribesmanCap: tribesmanCap,
      area: area,
      selectedTech: selectedTech,
      unlockedTechs: unlockedTechs,
      techTreeUnlockProgress: techTreeUnlockProgress,
      tribesmen: tribesmen
   };
}