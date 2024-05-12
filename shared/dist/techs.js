"use strict";
// @Cleanup: Move server-only stuff to the server and client-only stuff to the client
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTechChain = exports.getTechRequiredForItem = exports.getTechByID = exports.TECHS = exports.TechID = void 0;
const items_1 = require("./items");
const tribes_1 = require("./tribes");
var TechID;
(function (TechID) {
    TechID[TechID["fire"] = 0] = "fire";
    TechID[TechID["society"] = 1] = "society";
    TechID[TechID["gathering"] = 2] = "gathering";
    TechID[TechID["stoneTools"] = 3] = "stoneTools";
    TechID[TechID["furnace"] = 4] = "furnace";
    TechID[TechID["woodworking"] = 5] = "woodworking";
    TechID[TechID["throngling"] = 6] = "throngling";
    TechID[TechID["archery"] = 7] = "archery";
    TechID[TechID["reinforcedBows"] = 8] = "reinforcedBows";
    TechID[TechID["crossbows"] = 9] = "crossbows";
    TechID[TechID["iceBows"] = 10] = "iceBows";
    TechID[TechID["warmongering"] = 11] = "warmongering";
    TechID[TechID["leatherworking"] = 12] = "leatherworking";
    TechID[TechID["warriors"] = 13] = "warriors";
    TechID[TechID["basicArchitecture"] = 14] = "basicArchitecture";
    TechID[TechID["storage"] = 15] = "storage";
    TechID[TechID["frostshaping"] = 16] = "frostshaping";
    TechID[TechID["basicMachinery"] = 17] = "basicMachinery";
    TechID[TechID["herbalMedicine"] = 18] = "herbalMedicine";
    TechID[TechID["planterBox"] = 19] = "planterBox";
    TechID[TechID["healingTotem"] = 20] = "healingTotem";
})(TechID = exports.TechID || (exports.TechID = {}));
exports.TECHS = [
    {
        id: TechID.fire,
        name: "Fire",
        description: "A primitive method of cooking your food.",
        iconSrc: "fire.png",
        unlockedItems: [items_1.ItemType.campfire],
        positionX: 0,
        positionY: 0,
        dependencies: [],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 10
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
        unlockedItems: [items_1.ItemType.tribe_totem, items_1.ItemType.worker_hut],
        positionX: 1,
        positionY: 35,
        dependencies: [TechID.fire],
        researchItemRequirements: {
            [items_1.ItemType.wooden_pickaxe]: 1,
            [items_1.ItemType.wood]: 10
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
        unlockedItems: [items_1.ItemType.gathering_gloves],
        positionX: 22,
        positionY: -28,
        dependencies: [TechID.fire],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 25,
            [items_1.ItemType.berry]: 10
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
        unlockedItems: [items_1.ItemType.stone_pickaxe, items_1.ItemType.stone_axe, items_1.ItemType.stone_sword, items_1.ItemType.spear],
        positionX: -40,
        positionY: -1,
        dependencies: [TechID.fire],
        researchItemRequirements: {
            [items_1.ItemType.rock]: 20
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
        unlockedItems: [items_1.ItemType.workbench, items_1.ItemType.paper, items_1.ItemType.research_bench],
        positionX: 44,
        positionY: 4,
        dependencies: [TechID.fire],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 20
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
        unlockedItems: [items_1.ItemType.furnace],
        positionX: 62,
        positionY: 15,
        dependencies: [TechID.woodworking],
        researchItemRequirements: {
            [items_1.ItemType.campfire]: 2,
            [items_1.ItemType.rock]: 20
        },
        researchStudyRequirements: 10,
        blacklistedTribes: [],
        conflictingTechs: []
    },
    {
        id: TechID.throngling,
        name: "Throngling",
        description: "The way of the throngle",
        iconSrc: "throngling.png",
        unlockedItems: [items_1.ItemType.throngler],
        positionX: -28,
        positionY: 18,
        dependencies: [TechID.stoneTools],
        researchItemRequirements: {
            [items_1.ItemType.rock]: 20,
            [items_1.ItemType.cactus_spine]: 30
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
        unlockedItems: [items_1.ItemType.wooden_bow],
        positionX: -53,
        positionY: 19,
        dependencies: [TechID.stoneTools],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 35
        },
        // researchStudyRequirements: 75,
        researchStudyRequirements: 1,
        blacklistedTribes: [tribes_1.TribeType.barbarians],
        conflictingTechs: []
    },
    {
        id: TechID.reinforcedBows,
        name: "Reinforced Bows",
        description: "Reinforced bows",
        iconSrc: "reinforced-bows.png",
        unlockedItems: [items_1.ItemType.reinforced_bow],
        positionX: -67,
        positionY: 26,
        dependencies: [TechID.archery],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 35
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
        unlockedItems: [items_1.ItemType.crossbow],
        positionX: -50,
        positionY: 34,
        dependencies: [TechID.archery],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 35
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
        unlockedItems: [items_1.ItemType.ice_bow],
        positionX: -76,
        positionY: 17,
        dependencies: [TechID.archery, TechID.frostshaping],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 35
        },
        researchStudyRequirements: 75,
        blacklistedTribes: [tribes_1.TribeType.plainspeople, tribes_1.TribeType.barbarians, tribes_1.TribeType.goblins],
        conflictingTechs: []
    },
    {
        id: TechID.warmongering,
        name: "Warmongering",
        description: "Allows the crafting of deadly battleaxes, able to be thrown at enemies.",
        iconSrc: "warmongering.png",
        unlockedItems: [items_1.ItemType.stone_battleaxe],
        positionX: -55,
        positionY: 21,
        dependencies: [TechID.stoneTools],
        researchItemRequirements: {
            [items_1.ItemType.living_rock]: 30
        },
        researchStudyRequirements: 75,
        blacklistedTribes: [tribes_1.TribeType.frostlings, tribes_1.TribeType.goblins, tribes_1.TribeType.plainspeople],
        conflictingTechs: []
    },
    {
        id: TechID.leatherworking,
        name: "Leatherworking",
        description: "Stretch and meld leather into armour",
        iconSrc: "leatherworking.png",
        unlockedItems: [items_1.ItemType.leather_armour],
        positionX: -56,
        positionY: -18,
        dependencies: [TechID.stoneTools],
        researchItemRequirements: {
            [items_1.ItemType.leather]: 20
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
            [items_1.ItemType.wood]: 30,
            [items_1.ItemType.rock]: 50
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
        unlockedItems: [items_1.ItemType.wooden_wall, items_1.ItemType.wooden_hammer, items_1.ItemType.wooden_spikes, items_1.ItemType.punji_sticks],
        positionX: 69,
        positionY: -4,
        dependencies: [TechID.woodworking],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 40
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
        unlockedItems: [items_1.ItemType.barrel],
        positionX: 51,
        positionY: -15,
        dependencies: [TechID.woodworking],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 50
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
        unlockedItems: [items_1.ItemType.frost_armour, items_1.ItemType.deepfrost_pickaxe, items_1.ItemType.deepfrost_sword, items_1.ItemType.deepfrost_axe, items_1.ItemType.deepfrost_armour],
        positionX: -65,
        positionY: 0,
        dependencies: [TechID.stoneTools],
        researchItemRequirements: {
            [items_1.ItemType.frostcicle]: 15
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
        unlockedItems: [items_1.ItemType.sling_turret, items_1.ItemType.ballista],
        positionX: 81,
        positionY: -12,
        dependencies: [TechID.basicArchitecture],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 50,
            [items_1.ItemType.rock]: 50
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
        unlockedItems: [items_1.ItemType.herbal_medicine],
        positionX: 45,
        positionY: -34,
        dependencies: [TechID.gathering],
        researchItemRequirements: {
            [items_1.ItemType.berry]: 20,
            [items_1.ItemType.slimeball]: 20
        },
        researchStudyRequirements: 0,
        blacklistedTribes: [],
        conflictingTechs: []
    },
    {
        id: TechID.planterBox,
        name: "Gardening",
        description: "Sustainable plant growth",
        iconSrc: "planter-box.png",
        unlockedItems: [items_1.ItemType.planter_box, items_1.ItemType.gardening_gloves],
        positionX: 30,
        positionY: -51,
        dependencies: [TechID.gathering],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 40,
            [items_1.ItemType.leaf]: 30,
            [items_1.ItemType.berry]: 20
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
        unlockedItems: [items_1.ItemType.healing_totem],
        positionX: 70,
        positionY: -28,
        dependencies: [TechID.herbalMedicine, TechID.basicArchitecture],
        researchItemRequirements: {
            [items_1.ItemType.wood]: 50,
            [items_1.ItemType.herbal_medicine]: 15
        },
        researchStudyRequirements: 100,
        blacklistedTribes: [],
        conflictingTechs: []
    }
];
function getTechByID(techID) {
    for (let i = 0; i < exports.TECHS.length; i++) {
        const tech = exports.TECHS[i];
        if (tech.id === techID) {
            return tech;
        }
    }
    throw new Error(`No tech with id '${techID}'`);
}
exports.getTechByID = getTechByID;
function getTechRequiredForItem(itemType) {
    for (const tech of exports.TECHS) {
        if (tech.unlockedItems.includes(itemType)) {
            return tech.id;
        }
    }
    return null;
}
exports.getTechRequiredForItem = getTechRequiredForItem;
/** Returns all techs required to get to the item type, in ascending order of depth */
function getTechChain(itemType) {
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
exports.getTechChain = getTechChain;
