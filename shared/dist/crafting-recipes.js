"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecipeProductChain = exports.hasEnoughItems = exports.forceGetItemRecipe = exports.getItemRecipe = exports.CRAFTING_RECIPES = exports.CRAFTING_STATION_ITEM_TYPE_RECORD = exports.CRAFTING_STATIONS = exports.CraftingStation = void 0;
const items_1 = require("./items");
var CraftingStation;
(function (CraftingStation) {
    CraftingStation[CraftingStation["workbench"] = 0] = "workbench";
    CraftingStation[CraftingStation["slime"] = 1] = "slime";
    CraftingStation[CraftingStation["water"] = 2] = "water";
})(CraftingStation = exports.CraftingStation || (exports.CraftingStation = {}));
exports.CRAFTING_STATIONS = [0, 1, 2];
exports.CRAFTING_STATION_ITEM_TYPE_RECORD = {
    [CraftingStation.workbench]: items_1.ItemType.workbench
};
exports.CRAFTING_RECIPES = [
    {
        product: items_1.ItemType.workbench,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 15
        },
        aiCraftTimeTicks: 150 /* Vars.SLOW_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.wooden_sword,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 15
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.wooden_pickaxe,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 10
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.wooden_axe,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 10
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.wooden_hammer,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 10
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.stone_sword,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 5,
            [items_1.ItemType.rock]: 15
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.stone_pickaxe,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 5,
            [items_1.ItemType.rock]: 10
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.stone_axe,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 5,
            [items_1.ItemType.rock]: 10
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.stone_hammer,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 5,
            [items_1.ItemType.rock]: 10
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.leather_backpack,
        yield: 1,
        ingredients: {
            [items_1.ItemType.leather]: 5
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.flesh_sword,
        yield: 1,
        ingredients: {
            [items_1.ItemType.raw_beef]: 10,
            [items_1.ItemType.slimeball]: 10,
            [items_1.ItemType.eyeball]: 1
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.slime
    },
    {
        product: items_1.ItemType.tribe_totem,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 40
        },
        aiCraftTimeTicks: 150 /* Vars.SLOW_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.worker_hut,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 20,
        },
        aiCraftTimeTicks: 150 /* Vars.SLOW_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.barrel,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 20,
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.frost_armour,
        yield: 1,
        ingredients: {
            [items_1.ItemType.frostcicle]: 20,
            [items_1.ItemType.yeti_hide]: 10
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.campfire,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 15
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.furnace,
        yield: 1,
        ingredients: {
            [items_1.ItemType.campfire]: 1,
            [items_1.ItemType.rock]: 25
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.wooden_bow,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 20
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.crossbow,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 40,
            [items_1.ItemType.rock]: 30
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.reinforced_bow,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 40,
            [items_1.ItemType.rock]: 30
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.ice_bow,
        yield: 1,
        ingredients: {
            [items_1.ItemType.frostcicle]: 20
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.meat_suit,
        yield: 1,
        ingredients: {
            [items_1.ItemType.raw_beef]: 15,
            [items_1.ItemType.cactus_spine]: 10
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.deepfrost_sword,
        yield: 1,
        ingredients: {
            [items_1.ItemType.deepfrost_heart]: 1,
            [items_1.ItemType.frostcicle]: 30
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.deepfrost_pickaxe,
        yield: 1,
        ingredients: {
            [items_1.ItemType.deepfrost_heart]: 1,
            [items_1.ItemType.frostcicle]: 25
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.deepfrost_axe,
        yield: 1,
        ingredients: {
            [items_1.ItemType.deepfrost_heart]: 1,
            [items_1.ItemType.frostcicle]: 20
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.deepfrost_armour,
        yield: 1,
        ingredients: {
            [items_1.ItemType.deepfrost_heart]: 1,
            [items_1.ItemType.yeti_hide]: 10,
            [items_1.ItemType.frostcicle]: 50
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.fishlord_suit,
        yield: 1,
        ingredients: {
            [items_1.ItemType.raw_fish]: 64,
            [items_1.ItemType.cactus_spine]: 1
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.water
    },
    {
        product: items_1.ItemType.spear,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 10,
            [items_1.ItemType.rock]: 5
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */
    },
    {
        product: items_1.ItemType.paper,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 3
        },
        aiCraftTimeTicks: 30 /* Vars.FAST_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.research_bench,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 30,
            [items_1.ItemType.paper]: 10,
            [items_1.ItemType.slimeball]: 5
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.stone_battleaxe,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 15,
            [items_1.ItemType.living_rock]: 25
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.wooden_spikes,
        yield: 3,
        ingredients: {
            [items_1.ItemType.wood]: 10
        },
        aiCraftTimeTicks: 30 /* Vars.FAST_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.punji_sticks,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wooden_spikes]: 1,
            [items_1.ItemType.slimeball]: 1,
            [items_1.ItemType.poop]: 2
        },
        aiCraftTimeTicks: 30 /* Vars.FAST_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.sling_turret,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 20,
            [items_1.ItemType.rock]: 30
        },
        aiCraftTimeTicks: 150 /* Vars.SLOW_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.ballista,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 60,
            [items_1.ItemType.rock]: 50
        },
        aiCraftTimeTicks: 150 /* Vars.SLOW_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.wooden_wall,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 4
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.wooden_fence,
        yield: 1,
        ingredients: {
            [items_1.ItemType.wood]: 2
        },
        aiCraftTimeTicks: 30 /* Vars.FAST_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.herbal_medicine,
        yield: 2,
        ingredients: {
            [items_1.ItemType.leaf]: 10,
            [items_1.ItemType.berry]: 4,
            [items_1.ItemType.slimeball]: 2
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    },
    {
        product: items_1.ItemType.leaf_suit,
        yield: 1,
        ingredients: {
            [items_1.ItemType.leaf]: 40
        },
        aiCraftTimeTicks: 72 /* Vars.NORMAL_CRAFT_TIME */,
        craftingStation: CraftingStation.workbench
    }
];
function getItemRecipe(itemType) {
    for (let i = 0; i < exports.CRAFTING_RECIPES.length; i++) {
        const recipe = exports.CRAFTING_RECIPES[i];
        if (recipe.product === itemType) {
            return recipe;
        }
    }
    return null;
}
exports.getItemRecipe = getItemRecipe;
function forceGetItemRecipe(itemType) {
    const recipe = getItemRecipe(itemType);
    if (recipe === null) {
        throw new Error("No recipe for item type " + items_1.ItemType[itemType]);
    }
    return recipe;
}
exports.forceGetItemRecipe = forceGetItemRecipe;
function hasEnoughItems(itemSlotRecords, requiredItems) {
    // Tally the total resources available for crafting
    const availableResources = {};
    for (const itemSlots of itemSlotRecords) {
        for (const item of Object.values(itemSlots)) {
            if (!availableResources.hasOwnProperty(item.type)) {
                availableResources[item.type] = item.count;
            }
            else {
                availableResources[item.type] += item.count;
            }
        }
    }
    for (const [ingredientType, ingredientCount] of Object.entries(requiredItems).map(entry => [Number(entry[0]), entry[1]])) {
        // If there is none of the ingredient available, the recipe cannot be crafted
        if (!availableResources.hasOwnProperty(ingredientType)) {
            return false;
        }
        // If there isn't enough of the ingredient available, the recipe cannot be crafted
        if (availableResources[ingredientType] < ingredientCount) {
            return false;
        }
    }
    return true;
}
exports.hasEnoughItems = hasEnoughItems;
const copyItemTally = (tally) => {
    const copy = {};
    const itemTypes = Object.keys(tally).map(ingredientTypeString => Number(ingredientTypeString));
    for (let i = 0; i < itemTypes.length; i++) {
        const itemType = itemTypes[i];
        copy[itemType] = tally[itemType];
    }
    return copy;
};
function getRecipeProductChain(itemType, availableItems) {
    let currentAvailableItems = copyItemTally(availableItems);
    const productChain = new Array();
    const itemsToCheck = new Array();
    itemsToCheck.push({
        type: itemType,
        amountRequired: 1
    });
    while (itemsToCheck.length > 0) {
        const currentProductInfo = itemsToCheck[0];
        itemsToCheck.shift();
        const recipe = getItemRecipe(currentProductInfo.type);
        if (recipe === null) {
            continue;
        }
        // Don't add items which there are already enough of.
        const amountAvailable = currentAvailableItems[currentProductInfo.type];
        if (typeof amountAvailable !== "undefined" && amountAvailable >= currentProductInfo.amountRequired) {
            continue;
        }
        // Account for the product being crafted
        currentAvailableItems[currentProductInfo.type] -= currentProductInfo.amountRequired;
        productChain.push(currentProductInfo);
        const ingredientTypes = Object.keys(recipe.ingredients).map(ingredientTypeString => Number(ingredientTypeString));
        for (let i = 0; i < ingredientTypes.length; i++) {
            const ingredientType = ingredientTypes[i];
            const amountRequired = recipe.ingredients[ingredientType];
            itemsToCheck.push({
                type: ingredientType,
                amountRequired: amountRequired
            });
        }
    }
    return productChain;
}
exports.getRecipeProductChain = getRecipeProductChain;
