import { CraftingStation } from "webgl-test-shared/dist/items/crafting-recipes";
import { ComponentArray } from "./ComponentArray";
import { CraftingStationComponentData, ServerComponentType } from "webgl-test-shared/dist/components";

export class CraftingStationComponent {
   public readonly craftingStation: CraftingStation;
   
   constructor(craftingStation: CraftingStation) {
      this.craftingStation = craftingStation;
   }
}

export const CraftingStationComponentArray = new ComponentArray<ServerComponentType.craftingStation, CraftingStationComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): CraftingStationComponentData {
   const craftingStationComponent = CraftingStationComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.craftingStation,
      craftingStation: craftingStationComponent.craftingStation
   };
}