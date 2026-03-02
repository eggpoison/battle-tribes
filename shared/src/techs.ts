// @Cleanup: Move server-only stuff to the server and client-only stuff to the client

import { ItemRequirements } from "./items/crafting-recipes";
import { ItemType } from "./items/items";
import { createTallyFromRecord, ItemTally2 } from "./items/ItemTally";
import { TribeType } from "./tribes";

export enum TechID {
   fire,
   society,
   gathering,
   stoneTools,
   furnace,
   woodworking,
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
   mithrilworking,
   basicMachinery,
   herbalMedicine,
   gardening,
   healingTotem,
   lights,
   exoticArmour
}

// @Cleanup: rename study to work everywhere

export interface TechUnlockProgress {
   readonly itemProgress: ItemRequirements;
   studyProgress: number;
}

/** The current amount of items used in each tech's research */
export type TechTreeUnlockProgress = Partial<Record<TechID, TechUnlockProgress>>;

export interface Tech {
   readonly id: TechID;
   readonly name: string;
   readonly description: string;
   readonly iconSrc: string;
   readonly unlockedItems: ReadonlyArray<ItemType>;
   readonly positionX: number;
   readonly positionY: number;
   readonly dependencies: ReadonlyArray<TechID>;
   readonly researchItemRequirements: ItemTally2;
   readonly researchStudyRequirements: number;
   /** Tribes which are unable to research the tech */
   readonly blacklistedTribes: ReadonlyArray<TribeType>
   readonly conflictingTechs: ReadonlyArray<TechID>;
}

export const TECHS: ReadonlyArray<Tech> = [
   {
      id: TechID.fire,
      name: "Fire",
      description: "A primitive method of cooking your food.",
      iconSrc: "fire.png",
      unlockedItems: [ItemType.campfire],
      positionX: 0,
      positionY: 0,
      dependencies: [],
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 10
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wooden_pickaxe]: 1,
         [ItemType.wood]: 10
      }),
      // @Temporary
      // researchStudyRequirements: 20,
      researchStudyRequirements: 1,
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 25,
         [ItemType.berry]: 10
      }),
      researchStudyRequirements: 0,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
       id: TechID.stoneTools,
       name: "Stoneworking",
       description: "Manipulation of stone in crafting.",
       iconSrc: "stoneworking.png",
       unlockedItems: [ItemType.stonecarvingTable, ItemType.stone_pickaxe, ItemType.stone_axe, ItemType.stone_sword, ItemType.stone_hammer, ItemType.stoneSpear],
       positionX: -40,
       positionY: -1,
       dependencies: [TechID.fire],
       researchItemRequirements: createTallyFromRecord({
         [ItemType.rock]: 20
       }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 20
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.campfire]: 2,
         [ItemType.rock]: 20
      }),
      // @Temporary
      // researchStudyRequirements: 10,
      researchStudyRequirements: 10000,
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 35
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 35
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 35
      }),
      researchStudyRequirements: 75,
      blacklistedTribes: [],
      conflictingTechs: [TechID.reinforcedBows]
   },
   {
      id: TechID.iceBows,
      name: "Ice Bows",
      description: "Ice bows",
      iconSrc: "ice-bows.png",
      unlockedItems: [ItemType.frostshaper, ItemType.ice_bow],
      positionX: -76,
      positionY: 17,
      dependencies: [TechID.archery, TechID.frostshaping],
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 35
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.living_rock]: 30
      }),
      researchStudyRequirements: 75,
      blacklistedTribes: [TribeType.frostlings, TribeType.goblins, TribeType.plainspeople],
      conflictingTechs: []
   },
   {
      id: TechID.leatherworking,
      name: "Leatherworking",
      description: "Stretch and meld leather into useful items",
      iconSrc: "leatherworking.png",
      unlockedItems: [ItemType.leather_armour, ItemType.leather_backpack],
      positionX: -56,
      positionY: -18,
      dependencies: [TechID.stoneTools],
      researchItemRequirements: createTallyFromRecord({
         [ItemType.leather]: 20
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 30,
         [ItemType.rock]: 50
      }),
      researchStudyRequirements: 100,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.basicArchitecture,
      name: "Basic Architecture",
      description: "Primitive structures to build your first defences with.",
      iconSrc: "basic-architecture.png",
      unlockedItems: [ItemType.wooden_wall, ItemType.wooden_hammer, ItemType.wooden_spikes, ItemType.punji_sticks, ItemType.wooden_fence, ItemType.woodenBracings],
      positionX: 69,
      positionY: -4,
      dependencies: [TechID.woodworking],
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 40
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 50
      }),
      researchStudyRequirements: 50,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.frostshaping,
      name: "Frostshaping",
      description: "Make tundra gear from various tundra items.",
      iconSrc: "frostshaping.png",
      unlockedItems: [ItemType.frostArmour, ItemType.winterskinArmour, ItemType.iceWringer, ItemType.ivorySpear],
      positionX: -57,
      positionY: 7,
      dependencies: [TechID.stoneTools],
      researchItemRequirements: createTallyFromRecord({
         [ItemType.frostcicle]: 15
      }),
      researchStudyRequirements: 50,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.mithrilworking,
      name: "Mithrilworking",
      description: "Forge the strongest metal into the strongest equipment",
      iconSrc: "mithrilworking.png",
      unlockedItems: [ItemType.mithrilAnvil, ItemType.mithrilBar, ItemType.mithrilSword, ItemType.mithrilPickaxe, ItemType.mithrilAnvil, ItemType.mithrilPickaxe, ItemType.mithrilArmour],
      positionX: -64,
      positionY: -4,
      dependencies: [TechID.stoneTools],
      researchItemRequirements: createTallyFromRecord({
         [ItemType.rock]: 50
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 50,
         [ItemType.rock]: 50
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.berry]: 20,
         [ItemType.slimeball]: 20
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 40,
         [ItemType.leaf]: 30,
         [ItemType.berry]: 20
      }),
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
      researchItemRequirements: createTallyFromRecord({
         [ItemType.wood]: 50,
         [ItemType.herbal_medicine]: 15
      }),
      researchStudyRequirements: 100,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.lights,
      name: "Lights",
      description: "Items to fend off the dark",
      iconSrc: "lights.png",
      unlockedItems: [ItemType.fireTorch, ItemType.slurbTorch],
      positionX: 83,
      positionY: 4,
      dependencies: [TechID.basicArchitecture],
      researchItemRequirements: createTallyFromRecord({
         [ItemType.campfire]: 3,
         [ItemType.slurb]: 15
      }),
      researchStudyRequirements: 80,
      blacklistedTribes: [],
      conflictingTechs: []
   },
   {
      id: TechID.exoticArmour,
      name: "Exotic Armour",
      description: "Armour for those best excluded from society",
      iconSrc: "exotic-armour.png",
      unlockedItems: [ItemType.leaf_suit, ItemType.meat_suit],
      positionX: -66,
      positionY: -33,
      dependencies: [TechID.leatherworking],
      researchItemRequirements: createTallyFromRecord({
         [ItemType.leaf]: 50,
         [ItemType.raw_beef]: 25
      }),
      researchStudyRequirements: 30,
      blacklistedTribes: [],
      conflictingTechs: []
   },
];

export function getTechByID(techID: TechID): Tech {
   // @Speed
   for (let i = 0; i < TECHS.length; i++) {
      const tech = TECHS[i];
      if (tech.id === techID) {
         return tech;
      }
   }
   throw new Error(`No tech with id '${techID}'`);
}

export function getTechRequiredForItem(itemType: ItemType): Tech | null {
   for (const tech of TECHS) {
      // @Speed
      if (tech.unlockedItems.includes(itemType)) {
         return tech;
      }
   }

   return null;
}