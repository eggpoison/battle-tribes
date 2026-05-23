import { Packet, Entity, BuildingMaterial, ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray } from "./HealthComponent.js";
import { registerDirtyEntity } from "../server/player-clients.js";

export class BuildingMaterialComponent {
   public material: BuildingMaterial;
   public readonly healths: ReadonlyArray<number>;

   constructor(material: BuildingMaterial, healths: ReadonlyArray<number>) {
      this.material = material;
      this.healths = healths;
   }
}

export const BuildingMaterialComponentArray = new ComponentArray<BuildingMaterialComponent>(ServerComponentType.buildingMaterial, true, getDataLength, addDataToPacket);

export function upgradeMaterial(structure: Entity, materialComponent: BuildingMaterialComponent): void {
   materialComponent.material++;

   const health = materialComponent.healths[materialComponent.material];

   const healthComponent = HealthComponentArray.getComponent(structure);
   healthComponent.maxHealth = health;
   healthComponent.health = health;

   registerDirtyEntity(structure);
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);

   packet.writeNumber(buildingMaterialComponent.material);
}