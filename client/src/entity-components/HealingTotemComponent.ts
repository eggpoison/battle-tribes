import { HealingTotemTargetData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, angle, distance, lerp, randInt } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createHealingParticle } from "../particles";
import { Light, addLight, attachLightToEntity, removeLight } from "../lights";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

const EYE_LIGHTS_TRANSFORM_TICKS = Math.floor(0.5 / Settings.TPS);
const BASELINE_EYE_LIGHT_INTENSITY = 0.5;

class HealingTotemComponent extends ServerComponent {
   public healingTargetsData!: ReadonlyArray<HealingTotemTargetData>;

   public ticksSpentHealing = 0;

   public eyeLights = new Array<Light>();
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.updateHealingTargets(reader);
   }

   private updateHealingTargets(reader: PacketReader): void {
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
      
      this.healingTargetsData = healTargets;
   }

   public padData(reader: PacketReader): void {
      const numTargets = reader.readNumber();
      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numTargets);
   }

   public updateFromData(reader: PacketReader): void {
      this.updateHealingTargets(reader);
   }
}

export default HealingTotemComponent;

export const HealingTotemComponentArray = new ComponentArray<HealingTotemComponent>(ComponentArrayType.server, ServerComponentType.healingTotem, true, {
   onTick: onTick
});

function onTick(healingTotemComponent: HealingTotemComponent): void {
   // Update eye lights
   const isHealing = healingTotemComponent.healingTargetsData.length > 0;
   if (isHealing) {
      if (healingTotemComponent.eyeLights.length === 0) {
         for (let i = 0; i < 2; i++) {
            const offsetX = -12 * (i === 0 ? 1 : -1);
            const offsetY = 8;

            const light: Light = {
               offset: new Point(offsetX, offsetY),
               intensity: 0,
               strength: 0.6,
               radius: 0.1,
               r: 0.15,
               g: 1,
               b: 0
            };
            const lightID = addLight(light);
            attachLightToEntity(lightID, healingTotemComponent.entity.id);

            healingTotemComponent.eyeLights.push(light);
         }
      }
      
      healingTotemComponent.ticksSpentHealing++;
      
      let lightIntensity: number;
      if (healingTotemComponent.ticksSpentHealing < EYE_LIGHTS_TRANSFORM_TICKS) {
         lightIntensity = lerp(0, BASELINE_EYE_LIGHT_INTENSITY, healingTotemComponent.ticksSpentHealing / EYE_LIGHTS_TRANSFORM_TICKS);
      } else {
         const interval = Math.sin((healingTotemComponent.ticksSpentHealing / Settings.TPS - 1) * 2) * 0.5 + 0.5;
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
         const newIntensity = previousIntensity - 0.7 / Settings.TPS;

         if (newIntensity <= 0) {
            for (let i = 0; i < healingTotemComponent.eyeLights.length; i++) {
               const light = healingTotemComponent.eyeLights[i];
               removeLight(light);
            }
            healingTotemComponent.eyeLights = [];
         } else {
            for (let i = 0; i < 2; i++) {
               const light = healingTotemComponent.eyeLights[i];
               light.intensity = newIntensity;
            }
         }
      }
   }
   
   const transformComponent = healingTotemComponent.entity.getServerComponent(ServerComponentType.transform);
   
   for (let i = 0; i < healingTotemComponent.healingTargetsData.length; i++) {    
      const targetData = healingTotemComponent.healingTargetsData[i];
      const beamLength = distance(transformComponent.position.x, transformComponent.position.y, targetData.x, targetData.y);
      if (Math.random() > 0.02 * beamLength / Settings.TPS) {
         continue;
      }

      const beamDirection = angle(targetData.x - transformComponent.position.x, targetData.y - transformComponent.position.y);
      
      const progress = Math.random();
      const startX = lerp(transformComponent.position.x + 48 * Math.sin(beamDirection), targetData.x - 30 * Math.sin(beamDirection), progress);
      const startY = lerp(transformComponent.position.y + 48 * Math.cos(beamDirection), targetData.y - 30 * Math.cos(beamDirection), progress);

      // @Speed: garbage collection
      createHealingParticle(new Point(startX, startY), randInt(0, 2));
   }
}