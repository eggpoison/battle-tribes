import { CraftingStationComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { CraftingStation } from "webgl-test-shared/dist/items/crafting-recipes";

class CraftingStationComponent extends ServerComponent<ServerComponentType.craftingStation> {
   public readonly craftingStation: CraftingStation;
   
   constructor(entity: Entity, data: CraftingStationComponentData) {
      super(entity);

      this.craftingStation = data.craftingStation;
   }

   public updateFromData(_data: CraftingStationComponentData): void {}
}

export default CraftingStationComponent;