import { CookingComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { HeatingRecipe } from "../entities/cooking-entities/cooking-entity";
import { CookingComponentArray } from "./ComponentArray";

export class CookingComponent {
   public heatingTimer = 0;
   public currentRecipe: HeatingRecipe | null = null;

   public remainingHeatSeconds = 0;
}

export function serialiseCookingComponent(entity: Entity): CookingComponentData {
   const cookingComponent = CookingComponentArray.getComponent(entity.id);
   return {
      heatingProgress: cookingComponent.currentRecipe !== null ? cookingComponent.heatingTimer / cookingComponent.currentRecipe.cookTime : -1,
      isCooking: cookingComponent.remainingHeatSeconds > 0
   };
}