import { Entity } from "../../shared/src/entities";
import { LightLevelNode, LightLevelVars } from "../../shared/src/light-levels";
import { Packet } from "../../shared/src/packets";
import { Settings } from "../../shared/src/settings";
import { assert, distance, lerp, Point } from "../../shared/src/utils";
import { Hitbox } from "./hitboxes";
import Layer from "./Layer";
import PlayerClient from "./server/PlayerClient";
import { getEntityLayer, getGameTime } from "./world";

const enum Vars {
   /** The minimum light intensity from which the range of the light in nodes will be decided. */
   MIN_CALCULATED_LIGHT_INTENSITY = 0.05
}

export type LightID = number;

export interface Light {
   readonly id: LightID;
   readonly offset: Point;
   intensity: number;
   /** Number of tiles from the source it takes for the light's intensity to halve */
   strength: number;
   radius: number;
   r: number;
   g: number;
   b: number;
   lastNode: LightLevelNode;
   litNodes: ReadonlyArray<LightLevelNode>;
}

let lightIDCounter = 0;

const entityHitboxLightsMap: Partial<Record<Entity, Map<Hitbox, Light>>> = {};

export function getEntityHitboxLights(entity: Entity): Map<Hitbox, Light> | null {
   return entityHitboxLightsMap[entity] || null;
}

export function createLight(offset: Point, intensity: number, strength: number, radius: number, r: number, g: number, b: number): Light {
   const lightID = lightIDCounter++;

   return {
      id: lightID,
      offset: offset,
      intensity: intensity,
      strength: strength,
      radius: radius,
      r: r,
      g: g,
      b: b,
      lastNode: Number.MAX_SAFE_INTEGER,
      litNodes: []
   };
}

const clearLightLitNodes = (light: Light, lightLayer: Layer): void => {
   const litNodes = light.litNodes;
   for (let i = 0; i < litNodes.length; i++) {
      const node = litNodes[i];

      assert(typeof lightLayer.entityLightLevels[node] !== "undefined");
      // @Hack: '!'
      lightLayer.entityLightLevels[node]!.delete(light.id);
   }
}

export function calculateLightRangeNodes(lightStrength: number, lightIntensity: number, lightRadius: number): number {
   const rangeUnits = -64 * lightStrength * Math.log(Vars.MIN_CALCULATED_LIGHT_INTENSITY / lightIntensity) + lightRadius;
   return Math.ceil(rangeUnits / LightLevelVars.LIGHT_NODE_SIZE);
}

const updateLight = (light: Light, nodeX: number, nodeY: number, layer: Layer) => {
   // @Copynpaste from propagateAmbientLightFactor

   const lightNode = getLightLevelNode(nodeX, nodeY);
   if (lightNode === light.lastNode) {
      return;
   }
   light.lastNode = lightNode;

   // Clear previous lit nodes
   clearLightLitNodes(light, layer);

   const range = calculateLightRangeNodes(light.strength, light.intensity, light.radius);

   const minNodeX = Math.max(nodeX - range, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeX = Math.min(nodeX + range, (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   const minNodeY = Math.max(nodeY - range, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeY = Math.min(nodeY + range, (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   
   // @Speed: only run this propagate function on the edge nodes of dropdown zones, and fill in the inside node with 1's
   
   const litNodes = new Array<LightLevelNode>();

   for (let currentNodeX = minNodeX; currentNodeX <= maxNodeX; currentNodeX++) {
      for (let currentNodeY = minNodeY; currentNodeY <= maxNodeY; currentNodeY++) {
         let dist = distance(nodeX, nodeY, currentNodeX, currentNodeY) * LightLevelVars.LIGHT_NODE_SIZE;
         dist -= light.radius;
         if (dist < 0) {
            dist = 0;
         }
         
         const intensity = Math.exp(-dist / 64 / light.strength) * light.intensity;
         
         const node = getLightLevelNode(currentNodeX, currentNodeY);
         litNodes.push(node);

         if (typeof layer.entityLightLevels[node] === "undefined") {
            layer.entityLightLevels[node] = new Map();
         }
         
         const nodeEntityLightLevels = layer.entityLightLevels[node];
         // @Hack: '!'
         nodeEntityLightLevels!.set(light.id, intensity);
      }
   }

   light.litNodes = litNodes;
}

export function updateEntityLights(entity: Entity): void {
   const hitboxToLightMap = entityHitboxLightsMap[entity];
   if (typeof hitboxToLightMap === "undefined") {
      return;
   }

   const layer = getEntityLayer(entity);
   
   for (const pair of hitboxToLightMap) {
      const hitbox = pair[0];
      const light = pair[1];

      const nodeX = Math.floor(hitbox.box.position.x / LightLevelVars.LIGHT_NODE_SIZE);
      const nodeY = Math.floor(hitbox.box.position.y / LightLevelVars.LIGHT_NODE_SIZE);
      updateLight(light, nodeX, nodeY, layer);
   }
}

export function removeEntityLights(entity: Entity): void {
   const hitboxToLightMap = entityHitboxLightsMap[entity];
   if (typeof hitboxToLightMap === "undefined") {
      return;
   }

   delete entityHitboxLightsMap[entity];

   const layer = getEntityLayer(entity);
   
   for (const pair of hitboxToLightMap) {
      const light = pair[1];

      clearLightLitNodes(light, layer);
   }
}

// @Cleanup: the 3 final parameters are all related, and ideally should just be able to be deduced from the render part? maybe?
export function attachLightToHitbox(light: Light, hitbox: Hitbox, entity: Entity): void {
   if (typeof entityHitboxLightsMap[entity] === "undefined") {
      entityHitboxLightsMap[entity] = new Map(); 
   }

   const hitboxToLightMap = entityHitboxLightsMap[entity];
   // @Hack: '!'
   hitboxToLightMap!.set(hitbox, light);

   // updateLight(light, )
   
   // addLightToLayer(light, layer);
   
   // lightToRenderPartRecord[light.id] = {
   //    renderPart: renderPart,
   //    entity: entity
   // };

   // const lightIDs = renderPartToLightsRecord[renderPart.id];
   // if (typeof lightIDs === "undefined") {
   //    renderPartToLightsRecord[renderPart.id] = [light.id];
   // } else {
   //    lightIDs.push(light.id);
   // }
}

/** Returns the ambient light from the sun */
export function getAmbientLightLevel(): number {
   const time = getGameTime();
   if (time >= 6 && time < 18) {
      return 1;
   } else if (time >= 18 && time < 20) {
      return lerp(1, Settings.NIGHT_LIGHT_LEVEL, (time - 18) / 2);
   } else if (time >= 4 && time < 6) {
      return lerp(1, Settings.NIGHT_LIGHT_LEVEL, (6 - time) / 2);
   } else {
      return Settings.NIGHT_LIGHT_LEVEL;
   }
}

export function getLightLevelNode(nodeX: number, nodeY: number): LightLevelNode {
   return (nodeY + Settings.EDGE_GENERATION_DISTANCE * 4) * (Settings.FULL_WORLD_SIZE_TILES * 4) + nodeX + Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getLightIntensityAtNode(layer: Layer, node: LightLevelNode): number {
   // Ambient light
   let lightLevel = getAmbientLightLevel() * layer.ambientLightFactors[node];

   // Entity light
   const entityFactors = layer.entityLightLevels[node];
   if (typeof entityFactors !== "undefined") {
      for (const pair of entityFactors) {
         const entityLightLevel = pair[1];
         lightLevel += entityLightLevel;
      }
   }

   return lightLevel;
}

export function getLightIntensityAtPos(layer: Layer, x: number, y: number): number {
   const nodeX = Math.floor(x / LightLevelVars.LIGHT_NODE_SIZE);
   const nodeY = Math.floor(y / LightLevelVars.LIGHT_NODE_SIZE);
   const node = getLightLevelNode(nodeX, nodeY);
   
   return getLightIntensityAtNode(layer, node);
}

export function getPlayerLightLevelsDataLength(playerClient: PlayerClient): number {
   const minNodeX = Math.floor(playerClient.minVisibleX / LightLevelVars.LIGHT_NODE_SIZE);
   const maxNodeX = Math.floor(playerClient.maxVisibleX / LightLevelVars.LIGHT_NODE_SIZE);
   const minNodeY = Math.floor(playerClient.minVisibleY / LightLevelVars.LIGHT_NODE_SIZE);
   const maxNodeY = Math.floor(playerClient.maxVisibleY / LightLevelVars.LIGHT_NODE_SIZE);

   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;

   const numNodes = (maxNodeX + 1 - minNodeX) * (maxNodeY + 1 - minNodeY);
   lengthBytes += 2 * numNodes * Float32Array.BYTES_PER_ELEMENT;

   return lengthBytes;
}

export function addPlayerLightLevelsData(packet: Packet, playerClient: PlayerClient): void {
   const minNodeX = Math.floor(playerClient.minVisibleX / LightLevelVars.LIGHT_NODE_SIZE);
   const maxNodeX = Math.floor(playerClient.maxVisibleX / LightLevelVars.LIGHT_NODE_SIZE);
   const minNodeY = Math.floor(playerClient.minVisibleY / LightLevelVars.LIGHT_NODE_SIZE);
   const maxNodeY = Math.floor(playerClient.maxVisibleY / LightLevelVars.LIGHT_NODE_SIZE);

   const numNodes = (maxNodeX + 1 - minNodeX) * (maxNodeY + 1 - minNodeY);
   packet.writeNumber(numNodes);
   
   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const node = getLightLevelNode(nodeX, nodeY);
         const lightLevel = getLightIntensityAtNode(playerClient.lastLayer, node);

         packet.writeNumber(node);
         packet.writeNumber(lightLevel);
      }
   }
}

// @Speed: useless function
export function getLightDataLength(): number {
   return 11 * Float32Array.BYTES_PER_ELEMENT;
}

export function addLightData(packet: Packet, hitbox: Hitbox, light: Light): void {
   packet.writeNumber(hitbox.entity);
   packet.writeNumber(hitbox.localID);
   
   // Light data
   packet.writeNumber(light.id);
   packet.writePoint(light.offset);
   packet.writeNumber(light.intensity);
   packet.writeNumber(light.strength);
   packet.writeNumber(light.radius);
   packet.writeNumber(light.r);
   packet.writeNumber(light.g);
   packet.writeNumber(light.b);
}