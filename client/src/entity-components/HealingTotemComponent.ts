import { HealingTotemTargetData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, angle, distance, lerp, randInt } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createHealingParticle } from "../particles";
import { Light, addLight, attachLightToEntity, removeLight } from "../lights";
import { PacketReader } from "webgl-test-shared/dist/packets";

const EYE_LIGHTS_TRANSFORM_TICKS = Math.floor(0.5 / Settings.TPS);
const BASELINE_EYE_LIGHT_INTENSITY = 0.5;

class HealingTotemComponent extends ServerComponent {
   public healingTargetsData!: ReadonlyArray<HealingTotemTargetData>;

   private ticksSpentHealing = 0;

   private eyeLights = new Array<Light>();
   
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

   public tick(): void {
      // Update eye lights
      const isHealing = this.healingTargetsData.length > 0;
      if (isHealing) {
         if (this.eyeLights.length === 0) {
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
               attachLightToEntity(lightID, this.entity.id);

               this.eyeLights.push(light);
            }
         }
         
         this.ticksSpentHealing++;
         
         let lightIntensity: number;
         if (this.ticksSpentHealing < EYE_LIGHTS_TRANSFORM_TICKS) {
            lightIntensity = lerp(0, BASELINE_EYE_LIGHT_INTENSITY, this.ticksSpentHealing / EYE_LIGHTS_TRANSFORM_TICKS);
         } else {
            const interval = Math.sin((this.ticksSpentHealing / Settings.TPS - 1) * 2) * 0.5 + 0.5;
            lightIntensity = lerp(BASELINE_EYE_LIGHT_INTENSITY, 0.7, interval);
         }

         for (let i = 0; i < 2; i++) {
            const light = this.eyeLights[i];
            light.intensity = lightIntensity;
         }
      } else {
         this.ticksSpentHealing = 0;

         if (this.eyeLights.length > 0) {
            const previousIntensity = this.eyeLights[0].intensity;
            const newIntensity = previousIntensity - 0.7 / Settings.TPS;

            if (newIntensity <= 0) {
               for (let i = 0; i < this.eyeLights.length; i++) {
                  const light = this.eyeLights[i];
                  removeLight(light);
               }
               this.eyeLights = [];
            } else {
               for (let i = 0; i < 2; i++) {
                  const light = this.eyeLights[i];
                  light.intensity = newIntensity;
               }
            }
         }
      }
      
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      
      for (let i = 0; i < this.healingTargetsData.length; i++) {    
         const targetData = this.healingTargetsData[i];
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

   public padData(reader: PacketReader): void {
      const numTargets = reader.readNumber();
      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numTargets);
   }

   public updateFromData(reader: PacketReader): void {
      this.updateHealingTargets(reader);
   }
}

export default HealingTotemComponent;