import { EntityType } from "../../../../shared/src/entities";
import { LightLevelVars } from "../../../../shared/src/light-levels";
import { Settings } from "../../../../shared/src/settings";
import { assert, distance, Point } from "../../../../shared/src/utils";
import { createSlurbTorchConfig } from "../../entities/structures/slurb-torch";
import Layer from "../../Layer";
import { calculateLightRangeNodes, getLightIntensityAtNode, getLightLevelNode } from "../../lights";
import Tribe from "../../Tribe";
import { BuildingCandidate, buildingCandidateIsValid, createBuildingCandidate } from "./ai-building-utils";
import { createVirtualStructure, VirtualStructure } from "./TribeBuildingLayer";

const enum Vars {
   MIN_PLACEABLE_LIGHT_LEVEL = 0.3
}

export function structureLightLevelIsValid(lightLevel: number): boolean {
   return lightLevel >= Vars.MIN_PLACEABLE_LIGHT_LEVEL;
}

/** Generates a virtual structure for a light which will light up a specific node */
export function generateLightPosition(tribe: Tribe, layer: Layer, x: number, y: number): VirtualStructure {
   const nodeX = Math.floor(x / LightLevelVars.LIGHT_NODE_SIZE);
   const nodeY = Math.floor(y / LightLevelVars.LIGHT_NODE_SIZE);
   const node = getLightLevelNode(nodeX, nodeY);

   const startingLightLevel = getLightIntensityAtNode(layer, node);

   // The light level that the light will need to generate
   const requiredLightLevel = Vars.MIN_PLACEABLE_LIGHT_LEVEL - startingLightLevel;

   // @Supahack @Speed !
   const slurbTorchConfig = createSlurbTorchConfig(new Point(0, 0), 0, tribe, [], null);
   const slurbTorchLight = slurbTorchConfig.lights[0].light;
   const range = calculateLightRangeNodes(slurbTorchLight.strength, slurbTorchLight.intensity, slurbTorchLight.radius);

   const buildingLayer = tribe.getBuildingLayer(layer);
   
   const minNodeX = Math.max(nodeX - range, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeX = Math.min(nodeX + range, (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   const minNodeY = Math.max(nodeY - range, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeY = Math.min(nodeY + range, (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);

   const validCandidates = new Array<BuildingCandidate>();

   for (let currentNodeX = minNodeX; currentNodeX <= maxNodeX; currentNodeX++) {
      for (let currentNodeY = minNodeY; currentNodeY <= maxNodeY; currentNodeY++) {
         // @Copynpaste

         let dist = distance(nodeX, nodeY, currentNodeX, currentNodeY) * LightLevelVars.LIGHT_NODE_SIZE;
         dist -= slurbTorchLight.radius;
         if (dist < 0) {
            dist = 0;
         }
         
         const intensity = Math.exp(-dist / 64 / slurbTorchLight.strength) * slurbTorchLight.intensity;

         if (intensity < requiredLightLevel) {
            continue;
         }

         const x = (currentNodeX + 0.5) * LightLevelVars.LIGHT_NODE_SIZE;
         const y = (currentNodeY + 0.5) * LightLevelVars.LIGHT_NODE_SIZE;

         const candidate = createBuildingCandidate(EntityType.slurbTorch, buildingLayer, x, y, 0);
         if (buildingCandidateIsValid(candidate)) {
            validCandidates.push(candidate);
         }
      }
   }

   assert(validCandidates.length > 0);
   const candidate = validCandidates[Math.floor(Math.random() * validCandidates.length)];
   // @Copynpaste from findIdealWallPlacePosition
   return createVirtualStructure(candidate.buildingLayer, candidate.position, candidate.rotation, EntityType.slurbTorch);
}