import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { InventoryName, ItemType, ItemTypeString } from "battletribes-shared/items/items";
import { Settings } from "battletribes-shared/settings";
import { InventoryComponentArray, getInventory, consumeItemTypeFromInventory, addItemToInventory } from "./InventoryComponent";
import { CookingIngredientItemType, FuelSourceItemType } from "battletribes-shared/items/cooking-info";
import { getEntityType } from "../world";

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

export class CookingComponent {
   public heatingTimer = 0;
   public currentRecipe: HeatingRecipe | null = null;

   public remainingHeatSeconds = 0;

   constructor(remainingHeatSeconds: number) {
      this.remainingHeatSeconds = remainingHeatSeconds;
   }
}

export const CookingComponentArray = new ComponentArray<CookingComponent>(ServerComponentType.cooking, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

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

function onTick(cookingComponent: CookingComponent, entity: EntityID): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);

   const fuelInventory = getInventory(inventoryComponent, InventoryName.fuelInventory);
   const ingredientInventory = getInventory(inventoryComponent, InventoryName.ingredientInventory);
   
   const ingredient = ingredientInventory.itemSlots[1];
   if (typeof ingredient !== "undefined") {
      cookingComponent.currentRecipe = getHeatingRecipeByIngredientType(getEntityType(entity)!, ingredient.type);
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
   
            cookingComponent.remainingHeatSeconds += FUEL_SOURCES[fuel.type as keyof typeof FUEL_SOURCES];
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

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);

   // Heating progress
   packet.addNumber(cookingComponent.currentRecipe !== null ? cookingComponent.heatingTimer / cookingComponent.currentRecipe.cookTime : -1);
   // Is cooking
   packet.addBoolean(cookingComponent.remainingHeatSeconds > 0);
   packet.padOffset(3);
}