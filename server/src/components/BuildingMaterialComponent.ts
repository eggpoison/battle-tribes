import { BuildingMaterial, BuildingMaterialComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface BuildingMaterialComponentParams {
   readonly material: BuildingMaterial;
}

export class BuildingMaterialComponent {
   public material: BuildingMaterial;

   constructor(params: BuildingMaterialComponentParams) {
      this.material = params.material;
   }
}

export const BuildingMaterialComponentArray = new ComponentArray<ServerComponentType.buildingMaterial, BuildingMaterialComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): BuildingMaterialComponentData {
   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.buildingMaterial,
      material: buildingMaterialComponent.material
   };
}