import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { CookingIngredientItemType, FuelSourceItemType } from "webgl-test-shared/dist/cooking-info";
import Entity from "../../Entity";
import { CookingComponentArray, InventoryComponentArray } from "../../components/ComponentArray";
import { addItemToInventory, consumeItemTypeFromInventory, getInventory } from "../../components/InventoryComponent";

export interface HeatingRecipe {
   readonly ingredientType: CookingIngredientItemType;
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

export function tickCookingEntity(entity: Entity): void {
   const cookingEntityComponent = CookingComponentArray.getComponent(entity.id);
   const inventoryComponent = InventoryComponentArray.getComponent(entity.id);

   const fuelInventory = getInventory(inventoryComponent, "fuelInventory");
   const ingredientInventory = getInventory(inventoryComponent, "ingredientInventory");
   
   if (ingredientInventory.itemSlots.hasOwnProperty(1)) {
      cookingEntityComponent.currentRecipe = getHeatingRecipeByIngredientType(entity.type, ingredientInventory.itemSlots[1].type);
   }
   
   if (cookingEntityComponent.currentRecipe !== null) {
      // If the heating entity needs more heat, attempt to use a fuel item
      if (cookingEntityComponent.remainingHeatSeconds <= 0 && fuelInventory.itemSlots.hasOwnProperty(1)) {
         const fuel = fuelInventory.itemSlots[1];
         if (!FUEL_SOURCES.hasOwnProperty(fuel.type)) {
            console.warn(`Item type '${ItemType[fuel.type]}' is not a valid fuel type.`);
            return;
         }

         consumeItemTypeFromInventory(inventoryComponent, "fuelInventory", fuelInventory.itemSlots[1].type, 1);
         cookingEntityComponent.remainingHeatSeconds += FUEL_SOURCES[fuel.type as keyof typeof FUEL_SOURCES];
      }

      if (cookingEntityComponent.remainingHeatSeconds > 0) {
         cookingEntityComponent.heatingTimer += Settings.I_TPS;
         if (cookingEntityComponent.heatingTimer >= cookingEntityComponent.currentRecipe.cookTime) {
            // Remove from ingredient inventory and add to output inventory
            consumeItemTypeFromInventory(inventoryComponent, "ingredientInventory", cookingEntityComponent.currentRecipe.ingredientType, cookingEntityComponent.currentRecipe.ingredientAmount);
            addItemToInventory(inventoryComponent, "outputInventory", cookingEntityComponent.currentRecipe.productType, cookingEntityComponent.currentRecipe.productAmount);

            cookingEntityComponent.heatingTimer = 0;
            cookingEntityComponent.currentRecipe = null;
         }

         cookingEntityComponent.remainingHeatSeconds -= Settings.I_TPS;
      }
   }
}