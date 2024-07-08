// @Cleanup: Move server-only stuff to the server and client-only stuff to the client

import { ItemRequirements } from "./items/crafting-recipes";
import { ItemType } from "./items/items";
import { TribeType } from "./tribes";

export enum TechID {
   fire,
   society,
   gathering,
   stoneTools,
   furnace,
   woodworking,
   throngling,
   archery,
   reinforcedBows,
   crossbows,
   iceBows,
   warmongering,
   leatherworking,
   warriors,
   basicArchitecture,
   storage,
   frostshaping,
   basicMachinery,
   herbalMedicine,
   gardening,
   healingTotem
}

// @Cleanup: rename study to work everywhere

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

// @Cleanup: Should this be moved to tribes.ts?
export interface PlayerTribeData extends TribeData {
   readonly hasTotem: boolean;
   readonly numHuts: number;
   readonly tribesmanCap: number;
   readonly area: ReadonlyArray<[tileX: number, tileY: number]>;
   readonly selectedTechID: TechID | null;
   readonly unlockedTechs: ReadonlyArray<TechID>;
   readonly techTreeUnlockProgress: TechTreeUnlockProgress;
}

export interface EnemyTribeData extends TribeData {}

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
   readonly blacklistedTribes: ReadonlyArray<TribeType>
   readonly conflictingTechs: ReadonlyArray<TechID>;
}

export const TECHS: ReadonlyArray<TechInfo> = [
   {
      id: TechID.fire,
      name: "Fire",
      description: "A primitive method of cooking your food.",
      iconSrc: "fire.png",
      unlockedItems: [ItemType.campfire],
      positionX: 0,
      positionY: 0,
      dependencies: [],
      researchItemRequirements: {
         [ItemType.wood]: 10
      },
      researchStudyRequirements: 0,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.society,
      name: "Society",
      description: "The beginning of civilisation.",
      iconSrc: "society.png",
      unlockedItems: [ItemType.tribe_totem, ItemType.worker_hut],
      positionX: 1,
      positionY: 35,
      dependencies: [TechID.fire],
      researchItemRequirements: {
         [ItemType.wooden_pickaxe]: 1,
         [ItemType.wood]: 10
      },
      researchStudyRequirements: 20,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.gathering,
      name: "Gathering",
      description: "Efficient gathering of resources.",
      iconSrc: "gathering.png",
      unlockedItems: [ItemType.gathering_gloves],
      positionX: 22,
      positionY: -28,
      dependencies: [TechID.fire],
      researchItemRequirements: {
         [ItemType.wood]: 25,
         [ItemType.berry]: 10
      },
      researchStudyRequirements: 0,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
       id: TechID.stoneTools,
       name: "Stoneworking",
       description: "Manipulation of stone in crafting.",
       iconSrc: "stoneworking.png",
       unlockedItems: [ItemType.stone_pickaxe, ItemType.stone_axe, ItemType.stone_sword, ItemType.spear],
       positionX: -40,
       positionY: -1,
       dependencies: [TechID.fire],
       researchItemRequirements: {
         [ItemType.rock]: 20
       },
       researchStudyRequirements: 0,
       blacklistedTribes: [],
       conflictingTechs: []
   },
   {
      id: TechID.woodworking,
      name: "Woodworking",
      description: "Use a workbench to manipulate wood into more complex shapes",
      iconSrc: "woodworking.png",
      unlockedItems: [ItemType.workbench, ItemType.paper, ItemType.research_bench],
      positionX: 44,
      positionY: 4,
      dependencies: [TechID.fire],
      researchItemRequirements: {
         [ItemType.wood]: 20
      },
      researchStudyRequirements: 0,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.furnace,
      name: "Furnace",
      description: "A better way to cook your food.",
      iconSrc: "furnace.png",
      unlockedItems: [ItemType.furnace],
      positionX: 62,
      positionY: 15,
      dependencies: [TechID.woodworking],
      researchItemRequirements: {
         [ItemType.campfire]: 2,
         [ItemType.rock]: 20
      },
      // @Temporary
      // researchStudyRequirements: 10,
      researchStudyRequirements: 10000,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.throngling,
      name: "Throngling",
      description: "The way of the throngle",
      iconSrc: "throngling.png",
      unlockedItems: [ItemType.throngler],
      positionX: -28,
      positionY: 18,
      dependencies: [TechID.stoneTools],
      researchItemRequirements: {
         [ItemType.rock]: 20,
         [ItemType.cactus_spine]: 30
      },
      researchStudyRequirements: 40,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.archery,
      name: "Archery",
      description: "Ranged combat",
      iconSrc: "archery.png",
      unlockedItems: [ItemType.wooden_bow],
      positionX: -53,
      positionY: 19,
      dependencies: [TechID.stoneTools],
      researchItemRequirements: {
         [ItemType.wood]: 35
      },
      // researchStudyRequirements: 75,
      researchStudyRequirements: 1,
      blacklistedTribes: [TribeType.barbarians],
      conflictingTechs: []
   },
   {
      id: TechID.reinforcedBows,
      name: "Reinforced Bows",
      description: "Reinforced bows",
      iconSrc: "reinforced-bows.png",
      unlockedItems: [ItemType.reinforced_bow],
      positionX: -67,
      positionY: 26,
      dependencies: [TechID.archery],
      researchItemRequirements: {
         [ItemType.wood]: 35
      },
      researchStudyRequirements: 75,
      blacklistedTribes: [],
      conflictingTechs: [TechID.crossbows]
   },
   {
      id: TechID.crossbows,
      name: "Crossbows",
      description: "Crossbows",
      iconSrc: "crossbows.png",
      unlockedItems: [ItemType.crossbow],
      positionX: -50,
      positionY: 34,
      dependencies: [TechID.archery],
      researchItemRequirements: {
         [ItemType.wood]: 35
      },
      researchStudyRequirements: 75,
      blacklistedTribes: [],
      conflictingTechs: [TechID.reinforcedBows]
   },
   {
      id: TechID.iceBows,
      name: "Ice Bows",
      description: "Ice bows",
      iconSrc: "ice-bows.png",
      unlockedItems: [ItemType.ice_bow],
      positionX: -76,
      positionY: 17,
      dependencies: [TechID.archery, TechID.frostshaping],
      researchItemRequirements: {
         [ItemType.wood]: 35
      },
      researchStudyRequirements: 75,
      blacklistedTribes: [TribeType.plainspeople, TribeType.barbarians, TribeType.goblins],
      conflictingTechs: []
   },
   {
      id: TechID.warmongering,
      name: "Warmongering",
      description: "Allows the crafting of deadly battleaxes, able to be thrown at enemies.",
      iconSrc: "warmongering.png",
      unlockedItems: [ItemType.stone_battleaxe],
      positionX: -55,
      positionY: 21,
      dependencies: [TechID.stoneTools],
      researchItemRequirements: {
         [ItemType.living_rock]: 30
      },
      researchStudyRequirements: 75,
      blacklistedTribes: [TribeType.frostlings, TribeType.goblins, TribeType.plainspeople],
      conflictingTechs: []
   },
   {
      id: TechID.leatherworking,
      name: "Leatherworking",
      description: "Stretch and meld leather into armour",
      iconSrc: "leatherworking.png",
      unlockedItems: [ItemType.leather_armour],
      positionX: -56,
      positionY: -18,
      dependencies: [TechID.stoneTools],
      researchItemRequirements: {
         [ItemType.leather]: 20
      },
      researchStudyRequirements: 50,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.warriors,
      name: "Warriors",
      description: "Combat-focused tribesmen",
      iconSrc: "warriors.png",
      // @Incomplete: should unlock a blueprint type
      unlockedItems: [],
      positionX: 14,
      positionY: 48,
      dependencies: [TechID.society],
      researchItemRequirements: {
         [ItemType.wood]: 30,
         [ItemType.rock]: 50
      },
      researchStudyRequirements: 100,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.basicArchitecture,
      name: "Basic Architecture",
      description: "Primitive structures to build your first defences with.",
      iconSrc: "basic-architecture.png",
      unlockedItems: [ItemType.wooden_wall, ItemType.wooden_hammer, ItemType.wooden_spikes, ItemType.punji_sticks],
      positionX: 69,
      positionY: -4,
      dependencies: [TechID.woodworking],
      researchItemRequirements: {
         [ItemType.wood]: 40
      },
      researchStudyRequirements: 150,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.storage,
      name: "Storage",
      description: "",
      iconSrc: "storage.png",
      unlockedItems: [ItemType.barrel],
      positionX: 51,
      positionY: -15,
      dependencies: [TechID.woodworking],
      researchItemRequirements: {
         [ItemType.wood]: 50
      },
      researchStudyRequirements: 50,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.frostshaping,
      name: "Frostshaping",
      description: "",
      iconSrc: "frostshaping.png",
      unlockedItems: [ItemType.frost_armour, ItemType.deepfrost_pickaxe, ItemType.deepfrost_sword, ItemType.deepfrost_axe, ItemType.deepfrost_armour],
      positionX: -65,
      positionY: 0,
      dependencies: [TechID.stoneTools],
      researchItemRequirements: {
         [ItemType.frostcicle]: 15
      },
      researchStudyRequirements: 50,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.basicMachinery,
      name: "Basic Machinery",
      description: "The first turrets and automatic buildings.",
      iconSrc: "basic-machinery.png",
      unlockedItems: [ItemType.sling_turret, ItemType.ballista],
      positionX: 81,
      positionY: -12,
      dependencies: [TechID.basicArchitecture],
      researchItemRequirements: {
         [ItemType.wood]: 50,
         [ItemType.rock]: 50
      },
      researchStudyRequirements: 200,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.herbalMedicine,
      name: "Herbal Medicine",
      description: "A more effective source of healing.",
      iconSrc: "herbal-medicine.png",
      unlockedItems: [ItemType.herbal_medicine],
      positionX: 45,
      positionY: -34,
      dependencies: [TechID.gathering],
      researchItemRequirements: {
         [ItemType.berry]: 20,
         [ItemType.slimeball]: 20
      },
      researchStudyRequirements: 0,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.gardening,
      name: "Gardening",
      description: "Sustainable plant growth",
      iconSrc: "planter-box.png",
      unlockedItems: [ItemType.planter_box, ItemType.gardening_gloves, ItemType.fertiliser],
      positionX: 30,
      positionY: -51,
      dependencies: [TechID.gathering],
      researchItemRequirements: {
         [ItemType.wood]: 40,
         [ItemType.leaf]: 30,
         [ItemType.berry]: 20
      },
      researchStudyRequirements: 30,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.healingTotem,
      name: "Healing Totem",
      description: "A source of infinite healing.",
      iconSrc: "healing-totem.png",
      unlockedItems: [ItemType.healing_totem],
      positionX: 70,
      positionY: -28,
      dependencies: [TechID.herbalMedicine, TechID.basicArchitecture],
      researchItemRequirements: {
         [ItemType.wood]: 50,
         [ItemType.herbal_medicine]: 15
      },
      researchStudyRequirements: 100,
      blacklistedTribes: [],
      conflictingTechs: []
   }
];

export function getTechByID(techID: TechID): TechInfo {
   for (let i = 0; i < TECHS.length; i++) {
      const tech = TECHS[i];
      if (tech.id === techID) {
         return tech;
      }
   }
   throw new Error(`No tech with id '${techID}'`);
}

export function getTechRequiredForItem(itemType: ItemType): TechID | null {
   for (const tech of TECHS) {
      if (tech.unlockedItems.includes(itemType)) {
         return tech.id;
      }
   }

   return null;
}

/** Returns all techs required to get to the item type, in ascending order of depth */
export function getTechChain(itemType: ItemType): ReadonlyArray<TechInfo> {
   const initialTechID = getTechRequiredForItem(itemType);
   if (initialTechID === null) {
      return [];
   }

   const requiredTechs = [getTechByID(initialTechID)];
   const techsToCheck = [getTechByID(initialTechID)];
   while (techsToCheck.length > 0) {
      const currentTech = techsToCheck[0];
      techsToCheck.shift();

      for (let i = 0; i < currentTech.dependencies.length; i++) {
         const techID = currentTech.dependencies[i];
         const tech = getTechByID(techID);
         techsToCheck.push(tech);
         requiredTechs.splice(0, 0, tech);
      }
   }

   return requiredTechs;
}