import { BuildingMaterial, BuildingMaterialComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { ComponentConfig } from "../components";

export interface BuildingMaterialComponentParams {
   material: BuildingMaterial;
}

const WALL_HEALTHS = [25, 75];
const EMBRASURE_HEALTHS = [15, 45];
const TUNNEL_HEALTHS = [25, 75];
const DOOR_HEALTHS = [15, 45];
const SPIKE_HEALTHS = [15, 45];

export class BuildingMaterialComponent {
   public material: BuildingMaterial;

   constructor(params: BuildingMaterialComponentParams) {
      this.material = params.material;
   }
}

export const BuildingMaterialComponentArray = new ComponentArray<BuildingMaterialComponent>(ServerComponentType.buildingMaterial, true, {
   onInitialise: onInitialise,
   serialise: serialise
});

function onInitialise(config: ComponentConfig<ServerComponentType.health | ServerComponentType.buildingMaterial>, _: unknown, entityType: EntityType): void {
   const material = config[ServerComponentType.buildingMaterial].material;

   config[ServerComponentType.health].maxHealth = getStructureHealth(entityType, material);
}

function serialise(entityID: number): BuildingMaterialComponentData {
   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.buildingMaterial,
      material: buildingMaterialComponent.material
   };
}

export function getStructureHealth(entityType: EntityType, material: BuildingMaterial): number {
   switch (entityType) {
      case EntityType.wall: {
         return WALL_HEALTHS[material];
      }
      case EntityType.embrasure: {
         return EMBRASURE_HEALTHS[material];
      }
      case EntityType.tunnel: {
         return TUNNEL_HEALTHS[material];
      }
      case EntityType.door: {
         return DOOR_HEALTHS[material];
      }
      case EntityType.floorSpikes:
      case EntityType.wallSpikes: {
         return SPIKE_HEALTHS[material];
      }
      default: {
         console.warn("Unknown structure type " + EntityTypeString[entityType]);
         return 0;
      }
   }
}