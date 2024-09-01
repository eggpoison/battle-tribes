import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { FuelSourceItemType } from "webgl-test-shared/dist/cooking-info";
import { InventoryComponentArray, addItemToInventory, consumeItemTypeFromInventory, getInventory } from "../../../components/InventoryComponent";
import { CookingComponentArray } from "../../../components/CookingComponent";
import { ItemType, InventoryName, ItemTypeString } from "webgl-test-shared/dist/items/items";
import Board from "../../../Board";

export interface HeatingRecipe {
   readonly ingredientType: ItemType;
   readonly ingredientAmount: number;
   readonly productType: ItemType;
   readonly productAmount: number;
   readonly cookTime: number;
   /** Which heating entities are able to use the recipe */
   readonly usableHeatingEntityTypes: ReadonlyArray<EntityType>;
}

const HEATING_INFO: ReadonlyArray<HeatingRecipe> = [
   {
      ingredientType: ItemType.raw_beef,
      ingredientAmount: 1,
      productType: ItemType.cooked_beef,
      productAmount: 1,
      cookTime: 5,
      usableHeatingEntityTypes: [EntityType.campfire, EntityType.furnace]
   },
   {
      ingredientType: ItemType.meat_suit,
      ingredientAmount: 1,
      productType: ItemType.cooked_beef,
      productAmount: 5,
      cookTime: 5,
      usableHeatingEntityTypes: [EntityType.campfire, EntityType.furnace]
   },
   {
      ingredientType: ItemType.raw_fish,
      ingredientAmount: 1,
      productType: ItemType.cooked_fish,
      productAmount: 1,
      cookTime: 5,
      usableHeatingEntityTypes: [EntityType.campfire, EntityType.furnace]
   }
];

/** The seconds of heating given by different item types */
const FUEL_SOURCES: Record<FuelSourceItemType, number> = {
   [ItemType.wood]: 5
};

const getHeatingRecipeByIngredientType = (heatingEntityType: EntityType, ingredientType: ItemType): HeatingRecipe | null => {
   for (const heatingInfo of HEATING_INFO) {
      if (heatingInfo.ingredientType === ingredientType) {
         // Found it!

         // If the heating entity type can't use that recipe, don't let it craft it
         if (!heatingInfo.usableHeatingEntityTypes.includes(heatingEntityType)) {
            return null;
         }

         return heatingInfo;
      }
   }

   console.warn(`Couldn't find a heating recipe for '${ingredientType}'.`);
   return null;
}

export function tickCookingEntity(entity: EntityID): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   const inventoryComponent = InventoryComponentArray.getComponent(entity);

   const fuelInventory = getInventory(inventoryComponent, InventoryName.fuelInventory);
   const ingredientInventory = getInventory(inventoryComponent, InventoryName.ingredientInventory);
   
   const ingredient = ingredientInventory.itemSlots[1];
   if (typeof ingredient !== "undefined") {
      cookingComponent.currentRecipe = getHeatingRecipeByIngredientType(Board.getEntityType(entity)!, ingredient.type);
   }
   
   if (cookingComponent.currentRecipe !== null) {
      // If the heating entity needs more heat, attempt to use a fuel item
      if (cookingComponent.remainingHeatSeconds <= 0) {
         const fuel = fuelInventory.itemSlots[1];
         if (typeof fuel !== "undefined") {
            if (!FUEL_SOURCES.hasOwnProperty(fuel.type)) {
               console.warn(`Item type '${ItemTypeString[fuel.type]}' is not a valid fuel type.`);
               return;
            }
   
            cookingComponent.remainingHeatSeconds += FUEL_SOURCES[fuel.type as unknown as keyof typeof FUEL_SOURCES];
            consumeItemTypeFromInventory(inventoryComponent, InventoryName.fuelInventory, fuel.type, 1);
         }
      }

      if (cookingComponent.remainingHeatSeconds > 0) {
         cookingComponent.heatingTimer += Settings.I_TPS;
         if (cookingComponent.heatingTimer >= cookingComponent.currentRecipe.cookTime) {
            // Remove from ingredient inventory and add to output inventory

            consumeItemTypeFromInventory(inventoryComponent, InventoryName.ingredientInventory, cookingComponent.currentRecipe.ingredientType, cookingComponent.currentRecipe.ingredientAmount);

            const outputInventory = getInventory(inventoryComponent, InventoryName.outputInventory);
            addItemToInventory(outputInventory, cookingComponent.currentRecipe.productType, cookingComponent.currentRecipe.productAmount);

            cookingComponent.heatingTimer = 0;
            cookingComponent.currentRecipe = null;
         }

         cookingComponent.remainingHeatSeconds -= Settings.I_TPS;
      }
   }
}