import { Entity, PacketReader, Point, angle, distance, lerp, randInt, Settings, HealingTotemTargetData, ServerComponentType } from "webgl-test-shared";
import { createHealingParticle } from "../../particles";
import { Light, removeLight } from "../../lights";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface HealingTotemComponentData {
   readonly healingTargetsData: ReadonlyArray<HealingTotemTargetData>;
}

interface IntermediateInfo {}

export interface HealingTotemComponent {
   // @Hack @Temporary: make readonly
   healingTargetsData: ReadonlyArray<HealingTotemTargetData>;

   ticksSpentHealing: number;
   readonly eyeLights: Array<Light>;
}

const EYE_LIGHTS_TRANSFORM_TICKS = Math.floor(0.5 * Settings.DT_S);
const BASELINE_EYE_LIGHT_INTENSITY = 0.5;

export const HealingTotemComponentArray = new ServerComponentArray<HealingTotemComponent, HealingTotemComponentData, IntermediateInfo>(ServerComponentType.healingTotem, true, createComponent, getMaxRenderParts, decodeData);
HealingTotemComponentArray.populateIntermediateInfo = populateIntermediateInfo;
HealingTotemComponentArray.onTick = onTick;
HealingTotemComponentArray.updateFromData = updateFromData;

export function createHealingTotemComponentData(): HealingTotemComponentData {
   return {
      healingTargetsData: []
   };
}

function decodeData(reader: PacketReader): HealingTotemComponentData {
   const healTargets = new Array<HealingTotemTargetData>();
   const numTargets = reader.readNumber();
   for (let i = 0; i < numTargets; i++) {
      const healTargetID = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();
      const ticksHealed = reader.readNumber();

      healTargets.push({
         entityID: healTargetID,
         x: x,
         y: y,
         ticksHealed: ticksHealed
      });
   }
   
   return {
      healingTargetsData: healTargets
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/healing-totem/healing-totem.png")
      )
   );

   return {};
}

function createComponent(entityComponentData: EntityComponentData): HealingTotemComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const healingTotemComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.healingTotem);

   return {
      healingTargetsData: healingTotemComponentData.healingTargetsData,
      ticksSpentHealing: 0,
      eyeLights: []
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const healingTotemComponent = HealingTotemComponentArray.getComponent(entity);
   
   // Update eye lights
   const isHealing = healingTotemComponent.healingTargetsData.length > 0;
   if (isHealing) {
      if (healingTotemComponent.eyeLights.length === 0) {
         for (let i = 0; i < 2; i++) {
            const offsetX = -12 * (i === 0 ? 1 : -1);
            const offsetY = 8;

            // @INCOMPLETE
            
            // const light = createLight(
            //    new Point(offsetX, offsetY),
            //    0,
            //    0.6,
            //    0.1,
            //    0.15,
            //    1,
            //    0
            // );

            // // @Hack
            // const renderInfo = getEntityRenderInfo(entity);
            // attachLightToRenderPart(light, renderInfo.renderPartsByZIndex[0], entity);

            // healingTotemComponent.eyeLights.push(light);
         }
      }
      
      healingTotemComponent.ticksSpentHealing++;
      
      let lightIntensity: number;
      if (healingTotemComponent.ticksSpentHealing < EYE_LIGHTS_TRANSFORM_TICKS) {
         lightIntensity = lerp(0, BASELINE_EYE_LIGHT_INTENSITY, healingTotemComponent.ticksSpentHealing / EYE_LIGHTS_TRANSFORM_TICKS);
      } else {
         const interval = Math.sin((healingTotemComponent.ticksSpentHealing * Settings.DT_S - 1) * 2) * 0.5 + 0.5;
         lightIntensity = lerp(BASELINE_EYE_LIGHT_INTENSITY, 0.7, interval);
      }

      for (let i = 0; i < 2; i++) {
         const light = healingTotemComponent.eyeLights[i];
         light.intensity = lightIntensity;
      }
   } else {
      healingTotemComponent.ticksSpentHealing = 0;

      if (healingTotemComponent.eyeLights.length > 0) {
         const previousIntensity = healingTotemComponent.eyeLights[0].intensity;
         const newIntensity = previousIntensity - 0.7 * Settings.DT_S;

         if (newIntensity <= 0) {
            for (let i = 0; i < healingTotemComponent.eyeLights.length; i++) {
               const light = healingTotemComponent.eyeLights[i];
               removeLight(light);
            }
            healingTotemComponent.eyeLights.length = 0;
         } else {
            for (let i = 0; i < 2; i++) {
               const light = healingTotemComponent.eyeLights[i];
               light.intensity = newIntensity;
            }
         }
      }
   }
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const healingTotemHitbox = transformComponent.hitboxes[0];
   
   for (let i = 0; i < healingTotemComponent.healingTargetsData.length; i++) {    
      const targetData = healingTotemComponent.healingTargetsData[i];
      const beamLength = distance(healingTotemHitbox.box.position.x, healingTotemHitbox.box.position.y, targetData.x, targetData.y);
      if (Math.random() > 0.02 * beamLength * Settings.DT_S) {
         continue;
      }

      const beamDirection = angle(targetData.x - healingTotemHitbox.box.position.x, targetData.y - healingTotemHitbox.box.position.y);
      
      const progress = Math.random();
      const startX = lerp(healingTotemHitbox.box.position.x + 48 * Math.sin(beamDirection), targetData.x - 30 * Math.sin(beamDirection), progress);
      const startY = lerp(healingTotemHitbox.box.position.y + 48 * Math.cos(beamDirection), targetData.y - 30 * Math.cos(beamDirection), progress);

      // @Speed: garbage collection
      createHealingParticle(new Point(startX, startY), randInt(0, 2));
   }
}

function updateFromData(data: HealingTotemComponentData, entity: Entity): void {
   const healingTotemComponent = HealingTotemComponentArray.getComponent(entity);
   healingTotemComponent.healingTargetsData = data.healingTargetsData;
}