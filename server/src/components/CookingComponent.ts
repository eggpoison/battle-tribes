import { CookingComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { HeatingRecipe } from "../entities/structures/cooking-entities/cooking-entity";
import { ComponentArray } from "./ComponentArray";

export class CookingComponent {
   public heatingTimer = 0;
   public currentRecipe: HeatingRecipe | null = null;

   public remainingHeatSeconds = 0;
}

export const CookingComponentArray = new ComponentArray<ServerComponentType.cooking, CookingComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): CookingComponentData {
   const cookingComponent = CookingComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.cooking,
      heatingProgress: cookingComponent.currentRecipe !== null ? cookingComponent.heatingTimer / cookingComponent.currentRecipe.cookTime : -1,
      isCooking: cookingComponent.remainingHeatSeconds > 0
   };
}