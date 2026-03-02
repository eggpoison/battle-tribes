import { PacketReader, Entity, assert, Point, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared";
import { getEntityLayer, layers } from "./world";
import { createTranslationMatrix, Matrix3x2 } from "./rendering/matrices";
import { getHitboxByLocalID, Hitbox } from "./hitboxes";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { currentSnapshot } from "./client";

export type LightID = number;

export interface Light {
   readonly id: number;
   readonly offset: Point;
   intensity: number;
   /** Number of tiles from the source it takes for the light's intensity to halve */
   strength: number;
   radius: number;
   r: number;
   g: number;
   b: number;
   lastUpdateTicks: number;
}

interface LightHitboxInfo {
   // Store the entity for the hitbox on the light instead of the hitbox to save memory (the vast majority of hitboxes won't have lights on them)
   readonly entity: Entity;
   readonly hitbox: Hitbox;
}

export interface LightIntermediateInfo {
   readonly light: Light;
   readonly attachedHitbox: Hitbox;
}


const lightMap = new Map<LightID, Light>();

const lightToHitboxRecord: Partial<Record<LightID, LightHitboxInfo>> = {};
const hitboxToLightsMap = new Map<Hitbox, Array<LightID>>();

export function getNumLights(): number {
   return lightMap.size;
}

export function createLight(id: LightID, offset: Point, intensity: number, strength: number, radius: number, r: number, g: number, b: number): Light {
   return {
      id: id,
      offset: offset,
      intensity: intensity,
      strength: strength,
      radius: radius,
      r: r,
      g: g,
      b: b,
      lastUpdateTicks: currentSnapshot.tick
   };
}

// @Cleanup: the 2 final parameters are all related, and ideally should just be able to be deduced from the render part? maybe?
export function attachLightToHitbox(light: Light, entity: Entity, hitbox: Hitbox): void {
   // Make sure the light doesn't already exist
   assert(!lightMap.has(light.id))

   const layer = getEntityLayer(entity);
   
   layer.lights.push(light);
   lightMap.set(light.id, light);
   
   lightToHitboxRecord[light.id] = {
      entity: entity,
      hitbox: hitbox
   };

   const lightIDs = hitboxToLightsMap.get(hitbox);
   if (typeof lightIDs === "undefined") {
      hitboxToLightsMap.set(hitbox, [light.id]);
   } else {
      lightIDs.push(light.id);
   }
}

export function removeLight(light: Light): void {
   for (const layer of layers) {
      // @SPEED
      const idx = layer.lights.indexOf(light);
      if (idx === -1) {
         continue;
      }
      
      layer.lights.splice(idx, 1);
      lightMap.delete(light.id);

      const renderPartInfo = lightToHitboxRecord[light.id];
      delete lightToHitboxRecord[light.id];

      // If the light was attached to a hitbox, register the light's removal from that hitbox
      if (typeof renderPartInfo !== "undefined") {
         const hitbox = renderPartInfo.hitbox;
         
         const lightIDs = hitboxToLightsMap.get(hitbox)!;
         const idx = lightIDs.indexOf(light.id);
         lightIDs.splice(idx, 1);
         if (lightIDs.length === 0) {
            hitboxToLightsMap.delete(hitbox);
         }
      }
   }
}

export function removeLightsAttachedToHitbox(hitbox: Hitbox): void {
   const lightIDs = hitboxToLightsMap.get(hitbox);
   if (typeof lightIDs === "undefined") {
      return;
   }

   for (let i = lightIDs.length - 1; i >= 0; i--) {
      const lightID = lightIDs[i];
      const light = lightMap.get(lightID);
      if (typeof light !== "undefined") {
         removeLight(light);
      }
   }
}

export function getLightPositionMatrix(light: Light): Matrix3x2 {
   const attachedHitboxInfo = lightToHitboxRecord[light.id];
   if (typeof attachedHitboxInfo !== "undefined") {
      const hitbox = attachedHitboxInfo.hitbox;

      const x = hitbox.box.position.x + rotateXAroundOrigin(light.offset.x, light.offset.y, hitbox.box.angle);
      const y = hitbox.box.position.y + rotateYAroundOrigin(light.offset.x, light.offset.y, hitbox.box.angle);
      return createTranslationMatrix(x, y);
   }

   // @Incomplete
   // Make "attach light to world" logic
   throw new Error();
   // return light.offset;
}

export interface LightData {
   readonly entity: Entity;
   readonly hitboxLocalID: number;
   readonly id: LightID;
   readonly offset: Point;
   readonly intensity: number;
   readonly strength: number;
   readonly radius: number;
   readonly r: number;
   readonly g: number;
   readonly b: number;
}

export function readLightsFromData(reader: PacketReader): ReadonlyArray<LightData> {
   const lightData = new Array<LightData>();
   
   const numLights = reader.readNumber();
   for (let i = 0; i < numLights; i++) {
      const entity = reader.readNumber();
      const hitboxLocalID = reader.readNumber();

      const lightID = reader.readNumber();

      const offset = reader.readPoint();
      const intensity = reader.readNumber();
      const strength = reader.readNumber();
      const radius = reader.readNumber();
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();

      lightData.push({
         entity: entity,
         hitboxLocalID: hitboxLocalID,
         id: lightID,
         offset: offset,
         intensity: intensity,
         strength: strength,
         radius: radius,
         r: r,
         g: g,
         b: b
      });
   }

   return lightData;
}

export function updateLightsFromData(lightData: ReadonlyArray<LightData>): void {
   for (const data of lightData) {
      const entity = data.entity;
      const hitboxLocalID = data.hitboxLocalID;

      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = getHitboxByLocalID(transformComponent.hitboxes, hitboxLocalID);
      assert(hitbox !== null);
      
      const lightID = data.id;

      const existingLight = lightMap.get(lightID);
      if (typeof existingLight !== "undefined") {
         existingLight.intensity = data.intensity;
         existingLight.strength = data.strength;
         existingLight.radius = data.radius
         existingLight.r = data.r;
         existingLight.g = data.g;
         existingLight.b = data.b;

         existingLight.lastUpdateTicks = currentSnapshot.tick;
      } else {
         // New light

         const offset = data.offset;
         const intensity = data.intensity;
         const strength = data.strength;
         const radius = data.radius;
         const r = data.r;
         const g = data.g;
         const b = data.b;

         const light = createLight(lightID, offset, intensity, strength, radius, r, g, b);
         attachLightToHitbox(light, entity, hitbox);
      }
   }

   // Remove lights which are no longer visible
   for (const pair of lightMap) {
      const light = pair[1];

      if (light.lastUpdateTicks !== currentSnapshot.tick) {
         removeLight(light);
      }
   }
}