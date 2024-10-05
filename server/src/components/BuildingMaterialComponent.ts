import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { HealthComponentArray } from "./HealthComponent";

export class BuildingMaterialComponent {
   public material: BuildingMaterial;
   public readonly healths: ReadonlyArray<number>;

   constructor(material: BuildingMaterial, healths: ReadonlyArray<number>) {
      this.material = material;
      this.healths = healths;
   }
}

export const BuildingMaterialComponentArray = new ComponentArray<BuildingMaterialComponent>(ServerComponentType.buildingMaterial, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

export function upgradeMaterial(structure: EntityID, materialComponent: BuildingMaterialComponent): void {
   materialComponent.material++;

   const health = materialComponent.healths[materialComponent.material];

   const healthComponent = HealthComponentArray.getComponent(structure);
   healthComponent.maxHealth = health;
   healthComponent.health = health;
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);

   packet.addNumber(buildingMaterialComponent.material);
}