import { CraftingStation } from "webgl-test-shared/dist/items/crafting-recipes";
import { ComponentArray } from "./ComponentArray";
import { CraftingStationComponentData, ServerComponentType } from "webgl-test-shared/dist/components";

export interface CraftingStationComponentParams {
   readonly craftingStation: CraftingStation;
}

export class CraftingStationComponent {
   public readonly craftingStation: CraftingStation;
   
   constructor(params: CraftingStationComponentParams) {
      this.craftingStation = params.craftingStation;
   }
}

export const CraftingStationComponentArray = new ComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, {
   serialise: serialise
});

function serialise(entityID: number): CraftingStationComponentData {
   const craftingStationComponent = CraftingStationComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.craftingStation,
      craftingStation: craftingStationComponent.craftingStation
   };
}