import { BuildingMaterial, BuildingMaterialComponentData, ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { ComponentConfig } from "../components";
import { Packet } from "battletribes-shared/packets";

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
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: ComponentConfig<ServerComponentType.health | ServerComponentType.buildingMaterial>, _: unknown, entityType: EntityType): void {
   const material = config[ServerComponentType.buildingMaterial].material;

   config[ServerComponentType.health].maxHealth = getStructureHealth(entityType, material);
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);

   packet.addNumber(buildingMaterialComponent.material);
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