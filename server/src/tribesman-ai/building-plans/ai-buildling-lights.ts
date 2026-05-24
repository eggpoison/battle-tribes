import { EntityType, LightLevelVar, Settings, assert, distance } from "battletribes-shared";
import { createSlurbTorchConfig } from "../../entities/structures/slurb-torch.js";
import Layer from "../../Layer.js";
import { calculateLightRangeNodes, getLightIntensityAtNode, getLightLevelNode } from "../../lights.js";
import Tribe from "../../Tribe.js";
import { BuildingCandidate, buildingCandidateIsValid, createBuildingCandidate } from "./ai-building-utils.js";
import { createVirtualStructure, VirtualStructure } from "./TribeBuildingLayer.js";

const enum Vars {
   MIN_PLACEABLE_LIGHT_LEVEL = 0.3
}

export function structureLightLevelIsValid(lightLevel: number): boolean {
   return lightLevel >= Vars.MIN_PLACEABLE_LIGHT_LEVEL;
}

/** Generates a virtual structure for a light which will light up a specific node */
export function generateLightPosition(tribe: Tribe, layer: Layer, x: number, y: number): VirtualStructure {
   const nodeX = Math.floor(x / LightLevelVar.LIGHT_NODE_SIZE);
   const nodeY = Math.floor(y / LightLevelVar.LIGHT_NODE_SIZE);
   const node = getLightLevelNode(nodeX, nodeY);

   const startingLightLevel = getLightIntensityAtNode(layer, node);

   // The light level that the light will need to generate
   const requiredLightLevel = Vars.MIN_PLACEABLE_LIGHT_LEVEL - startingLightLevel;

   // @Supahack @Speed !
   const slurbTorchConfig = createSlurbTorchConfig(0, 0, 0, tribe, [], null);
   const slurbTorchLight = slurbTorchConfig.lights[0].light;
   const range = calculateLightRangeNodes(slurbTorchLight.strength, slurbTorchLight.intensity, slurbTorchLight.radius);

   const buildingLayer = tribe.getBuildingLayer(layer);
   
   const minNodeX = Math.max(nodeX - range, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeX = Math.min(nodeX + range, (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   const minNodeY = Math.max(nodeY - range, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeY = Math.min(nodeY + range, (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);

   const validCandidates: Array<BuildingCandidate> = [];

   for (let currentNodeX = minNodeX; currentNodeX <= maxNodeX; currentNodeX++) {
      for (let currentNodeY = minNodeY; currentNodeY <= maxNodeY; currentNodeY++) {
         // @Copynpaste

         let dist = distance(nodeX, nodeY, currentNodeX, currentNodeY) * LightLevelVar.LIGHT_NODE_SIZE;
         dist -= slurbTorchLight.radius;
         if (dist < 0) {
            dist = 0;
         }
         
         const intensity = Math.exp(-dist / 64 / slurbTorchLight.strength) * slurbTorchLight.intensity;

         if (intensity < requiredLightLevel) {
            continue;
         }

         const x = (currentNodeX + 0.5) * LightLevelVar.LIGHT_NODE_SIZE;
         const y = (currentNodeY + 0.5) * LightLevelVar.LIGHT_NODE_SIZE;

         const candidate = createBuildingCandidate(EntityType.slurbTorch, buildingLayer, x, y, 0);
         if (buildingCandidateIsValid(candidate)) {
            validCandidates.push(candidate);
         }
      }
   }

   assert(validCandidates.length > 0);
   const candidate = validCandidates[Math.floor(Math.random() * validCandidates.length)];
   // @Copynpaste from findIdealWallPlacePosition
   return createVirtualStructure(candidate.buildingLayer, candidate.position.x, candidate.position.y, candidate.rotation, EntityType.slurbTorch);
}