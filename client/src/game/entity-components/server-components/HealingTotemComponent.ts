import { HealingTotemTargetData, ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { lerp, distance, angle, Point, randInt } from "../../../../../shared/src/utils";
import { createHealingParticle } from "../../particles";
import { Light, removeLight } from "../../lights";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface HealingTotemComponentData {
   readonly healingTargetsData: readonly HealingTotemTargetData[];
}

export interface HealingTotemComponent {
   // @Hack @Temporary: make readonly
   healingTargetsData: readonly HealingTotemTargetData[];

   ticksSpentHealing: number;
   readonly eyeLights: Light[];
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.healingTotem, typeof HealingTotemComponentArray> {}
}

const EYE_LIGHTS_TRANSFORM_TICKS = Math.floor(0.5 * Settings.DT_S);
const BASELINE_EYE_LIGHT_INTENSITY = 0.5;

export const HealingTotemComponentArray = registerServerComponentArray(
   ServerComponentType.healingTotem,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
HealingTotemComponentArray.populateIntermediateInfo = populateIntermediateInfo;
HealingTotemComponentArray.onTick = onTick;
HealingTotemComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): HealingTotemComponentData {
   const healTargets: HealingTotemTargetData[] = [];
   const numTargets = reader.readNumber();
   for (let i = 0; i < numTargets; i++) {
      const healTarget: Entity = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();
      const ticksHealed = reader.readNumber();

      healTargets.push({
         entity: healTarget,
         x: x,
         y: y,
         ticksHealed: ticksHealed
      });
   }
   
   return {
      healingTargetsData: healTargets
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_healingTotem_healingTotem
      )
   );
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
            // const renderObject = getEntityRenderObject(entity);
            // attachLightToRenderPart(light, renderObject.renderPartsByZIndex[0], entity);

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
      const beamLength = distance(healingTotemHitbox.box.posX, healingTotemHitbox.box.posY, targetData.x, targetData.y);
      if (Math.random() > 0.02 * beamLength * Settings.DT_S) {
         continue;
      }

      const beamDirection = angle(targetData.x - healingTotemHitbox.box.posX, targetData.y - healingTotemHitbox.box.posY);
      
      const progress = Math.random();
      const startX = lerp(healingTotemHitbox.box.posX + 48 * Math.sin(beamDirection), targetData.x - 30 * Math.sin(beamDirection), progress);
      const startY = lerp(healingTotemHitbox.box.posY + 48 * Math.cos(beamDirection), targetData.y - 30 * Math.cos(beamDirection), progress);

      // @Speed: garbage collection
      createHealingParticle(new Point(startX, startY), randInt(0, 2));
   }
}

function updateFromData(data: HealingTotemComponentData, entity: Entity): void {
   const healingTotemComponent = HealingTotemComponentArray.getComponent(entity);
   healingTotemComponent.healingTargetsData = data.healingTargetsData;
}

export function createHealingTotemComponentData(): HealingTotemComponentData {
   return {
      healingTargetsData: []
   };
}