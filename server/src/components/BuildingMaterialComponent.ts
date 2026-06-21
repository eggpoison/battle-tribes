import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray } from "./HealthComponent.js";
import { registerDirtyEntity } from "../server/player-clients.js";
import { BuildingMaterial, ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";

export class BuildingMaterialComponent {
   public material: BuildingMaterial;
   public readonly healths: readonly number[];

   constructor(material: BuildingMaterial, healths: readonly number[]) {
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
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);

   packet.writeNumber(buildingMaterialComponent.material);
}