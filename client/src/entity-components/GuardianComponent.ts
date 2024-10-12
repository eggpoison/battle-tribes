import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { GuardianAttackType, GuardianCrystalBurstStage, GuardianCrystalSlamStage, GuardianSpikyBallSummonStage, ServerComponentType } from "../../../shared/src/components";
import { PacketReader } from "../../../shared/src/packets";
import { lerp, Point } from "../../../shared/src/utils";
import Entity from "../Entity";
import { Light, addLight, attachLightToRenderPart } from "../lights";
import RenderPart from "../render-parts/RenderPart";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { playSound } from "../sound";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../world";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   SPIKY_BALL_SUMMON_SHAKE_AMOUNT = 2
}

export default class GuardianComponent extends ServerComponent {
   private rubyRenderParts = new Array<RenderPart>();
   private amethystRenderParts = new Array<RenderPart>();
   private emeraldRenderParts = new Array<RenderPart>();

   private rubyLights = new Array<[number, Light]>();
   private emeraldLights = new Array<[number, Light]>();
   private amethystLights = new Array<[number, Light]>();

   private rubyGemActivation = 0;
   private emeraldGemActivation = 0;
   private amethystGemActivation = 0;

   private limbRenderParts = new Array<RenderPart>();
   private limbCrackRenderParts = new Array<RenderPart>();
   private limbCrackLights = new Array<Light>();

   private limbRubyGemActivation = 0;
   private limbEmeraldGemActivation = 0;
   private limbAmethystGemActivation = 0;

   private attackType = GuardianAttackType.none;
   private attackStage = 0;

   constructor(entity: Entity) {
      super(entity);

      const renderInfo = getEntityRenderInfo(entity.id);

      // Head
      
      const headRenderPart = new TexturedRenderPart(
         null,
         2,
         0,
         getTextureArrayIndex("entities/guardian/guardian-head.png")
      );
      headRenderPart.offset.y = 28;
      renderInfo.attachRenderThing(headRenderPart);
      
      const headRubies = new TexturedRenderPart(
         headRenderPart,
         2.1,
         0,
         getTextureArrayIndex("entities/guardian/guardian-head-rubies.png")
      );
      renderInfo.attachRenderThing(headRubies);
      this.rubyRenderParts.push(headRubies);

      // Body

      const bodyRenderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/guardian/guardian-body.png")
      );
      renderInfo.attachRenderThing(bodyRenderPart);

      const bodyAmethystsRenderPart = new TexturedRenderPart(
         bodyRenderPart,
         1.1,
         0,
         getTextureArrayIndex("entities/guardian/guardian-body-amethysts.png")
      );
      renderInfo.attachRenderThing(bodyAmethystsRenderPart);
      this.amethystRenderParts.push(bodyAmethystsRenderPart);

      const bodyEmeraldsRenderPart = new TexturedRenderPart(
         bodyRenderPart,
         1.1,
         0,
         getTextureArrayIndex("entities/guardian/guardian-body-emeralds.png")
      );
      renderInfo.attachRenderThing(bodyEmeraldsRenderPart);
      this.emeraldRenderParts.push(bodyEmeraldsRenderPart);

      // Red lights

      let light: Light = {
         offset: new Point(0, 4.5 * 4),
         intensity: 0.5,
         strength: 0.3,
         radius: 6,
         r: 1,
         g: 0,
         b: 0.1
      };
      let lightID = addLight(light);
      attachLightToRenderPart(lightID, headRenderPart.id);
      this.rubyLights.push([light.intensity, light]);

      for (let i = 0; i < 2; i++) {
         const light: Light = {
            offset: new Point(4.25 * 4 * (i === 0 ? 1 : -1), 3.25 * 4),
            intensity: 0.4,
            strength: 0.2,
            radius: 4,
            r: 1,
            g: 0,
            b: 0.1
         };
         const lightID = addLight(light);
         attachLightToRenderPart(lightID, headRenderPart.id);
         this.rubyLights.push([light.intensity, light]);
      }

      // Green lights

      light = {
         offset: new Point(0, -3 * 4),
         intensity: 0.5,
         strength: 0.3,
         radius: 6,
         r: 0,
         g: 1,
         b: 0
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.emeraldLights.push([light.intensity, light]);

      // Amethyst lights
      // @Hack @Robustness: Make pixels able to glow!

      // @Temporary
      // light = {
      //    offset: new Point(0, 4 * 4),
      //    intensity: 0.35,
      //    strength: 0.2,
      //    radius: 4,
      //    r: 0.6,
      //    g: 0,
      //    b: 1
      // };
      // lightID = addLight(light);
      // attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(5 * 4, 6.5 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(6.5 * 4, 3 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(10 * 4, 0),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(7 * 4, -5 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(3.5 * 4, -8 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(-2 * 4, -9 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(-5 * 4, -5 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(-8 * 4, -3 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(-7 * 4, 2.5 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);

      light = {
         offset: new Point(-8 * 4, 6 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
      this.amethystLights.push([light.intensity, light]);
   }
   
   public onLoad(): void {
      // Attach limb render parts
      const renderInfo = getEntityRenderInfo(this.entity.id);
      const transformComponent = TransformComponentArray.getComponent(this.entity.id);
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         if (hitbox.flags.includes(HitboxFlag.GUARDIAN_LIMB_HITBOX)) {
            const limbRenderPart = new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/guardian/guardian-limb.png")
            );
            renderInfo.attachRenderThing(limbRenderPart);
            this.limbRenderParts.push(limbRenderPart);

            const cracksRenderPart = new TexturedRenderPart(
               limbRenderPart,
               0,
               0,
               getTextureArrayIndex("entities/guardian/guardian-limb-gem-cracks.png")
            );
            renderInfo.attachRenderThing(cracksRenderPart);
            this.limbCrackRenderParts.push(cracksRenderPart);

            const light: Light = {
               offset: new Point(0, 0),
               intensity: 0.5,
               strength: 0.3,
               radius: 12,
               r: 0,
               g: 0,
               b: 0
            };
            const lightID = addLight(light);
            attachLightToRenderPart(lightID, cracksRenderPart.id);
            this.limbCrackLights.push(light);
         }
      }
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(9 * Float32Array.BYTES_PER_ELEMENT);
   }

   private setColours(renderParts: ReadonlyArray<RenderPart>, lights: ReadonlyArray<[number, Light]>, activation: number, tintR: number, tintG: number, tintB: number): void {
      for (let i = 0; i < renderParts.length; i++) {
         const renderPart = renderParts[i];
         renderPart.tintR = tintR;
         renderPart.tintG = tintG;
         renderPart.tintB = tintB;
      }
      
      for (let i = 0; i < lights.length; i++) {
         const pair = lights[i];
         const maxIntensity = pair[0];
         const light = pair[1];

         light.intensity = maxIntensity * activation;
      }
   }
   
   public updateFromData(reader: PacketReader, isInitialData: boolean): void {
      const rubyGemActivation = reader.readNumber();
      const emeraldGemActivation = reader.readNumber();
      const amethystGemActivation = reader.readNumber();

      const limbRubyGemActivation = reader.readNumber();
      const limbEmeraldGemActivation = reader.readNumber();
      const limbAmethystGemActivation = reader.readNumber();

      const attackType = reader.readNumber();
      const attackStage = reader.readNumber();
      const stageProgress = reader.readNumber();

      const actualRubyGemActivation = lerp(rubyGemActivation, 1, limbRubyGemActivation);
      if (actualRubyGemActivation !== this.rubyGemActivation) {
         this.setColours(this.rubyRenderParts, this.rubyLights, actualRubyGemActivation, actualRubyGemActivation, 0, 0);
         const renderInfo = getEntityRenderInfo(this.entity.id);
         renderInfo.dirty();
      }
      const actualEmeraldGemActivation = lerp(emeraldGemActivation, 1, limbEmeraldGemActivation);
      if (actualEmeraldGemActivation !== this.emeraldGemActivation) {
         this.setColours(this.emeraldRenderParts, this.emeraldLights, actualEmeraldGemActivation, 0, actualEmeraldGemActivation, 0);
         const renderInfo = getEntityRenderInfo(this.entity.id);
         renderInfo.dirty();
      }
      const actualAmethystGemActivation = lerp(amethystGemActivation, 1, limbAmethystGemActivation);
      if (actualAmethystGemActivation !== this.amethystGemActivation) {
         this.setColours(this.amethystRenderParts, this.amethystLights, actualAmethystGemActivation, actualAmethystGemActivation * 0.9, actualAmethystGemActivation * 0.2, actualAmethystGemActivation * 0.9);
         const renderInfo = getEntityRenderInfo(this.entity.id);
         renderInfo.dirty();
      }

      this.rubyGemActivation = actualRubyGemActivation;
      this.emeraldGemActivation = actualEmeraldGemActivation;
      this.amethystGemActivation = actualAmethystGemActivation;

      if (limbRubyGemActivation !== this.limbRubyGemActivation || limbEmeraldGemActivation !== this.limbEmeraldGemActivation || limbAmethystGemActivation !== this.limbAmethystGemActivation) {
         for (let i = 0; i < this.limbCrackRenderParts.length; i++) {
            const renderPart = this.limbCrackRenderParts[i];
            renderPart.tintR = 0;
            renderPart.tintG = 0;
            renderPart.tintB = 0;
            
            // @Hack
            // Ruby
            renderPart.tintR += limbRubyGemActivation;
            renderPart.tintG += 0;
            renderPart.tintB += 0;
            // Emerald
            renderPart.tintR += 0;
            renderPart.tintG += limbEmeraldGemActivation;
            renderPart.tintB += 0;
            // Amethyst
            renderPart.tintR += limbAmethystGemActivation * 0.9;
            renderPart.tintG += limbAmethystGemActivation * 0.2;
            renderPart.tintB += limbAmethystGemActivation * 0.9;

            const light = this.limbCrackLights[i];
            light.r = 0;
            light.g = 0;
            light.b = 0;

            // @Hack
            // Ruby
            light.r += limbRubyGemActivation * 0.6;
            light.g += 0;
            light.b += 0;
            // Emerald
            light.r += 0;
            light.g += limbEmeraldGemActivation * 0.6;
            light.b += 0;
            // Amethyst
            light.r += limbAmethystGemActivation * 0.5;
            light.g += limbAmethystGemActivation * 0.2;
            light.b += limbAmethystGemActivation * 0.5;
         }
         const renderInfo = getEntityRenderInfo(this.entity.id);
         renderInfo.dirty();
      }

      this.limbRubyGemActivation = limbRubyGemActivation;
      this.limbEmeraldGemActivation = limbEmeraldGemActivation;
      this.limbAmethystGemActivation = limbAmethystGemActivation;

      for (let i = 0; i < this.limbRenderParts.length; i++) {
         const renderPart = this.limbRenderParts[i];
         renderPart.shakeAmount = 0;
      }
      
      switch (attackType) {
         case GuardianAttackType.crystalSlam: {
            // If just starting the slam, play charge sound
            if (this.attackType !== GuardianAttackType.crystalSlam) {
               const transformComponent = TransformComponentArray.getComponent(this.entity.id);
               playSound("guardian-rock-smash-charge.mp3", 0.4, 1, transformComponent.position);
            }

            // If starting slam, play start sound
            if (this.attackStage === GuardianCrystalSlamStage.windup && attackStage === GuardianCrystalSlamStage.slam) {
               const transformComponent = TransformComponentArray.getComponent(this.entity.id);
               playSound("guardian-rock-smash-start.mp3", 0.2, 1, transformComponent.position);
            }
            
            // If going from slam to return, then play the slam sound
            if (this.attackStage === GuardianCrystalSlamStage.slam && attackStage === GuardianCrystalSlamStage.return) {
               const transformComponent = TransformComponentArray.getComponent(this.entity.id);
               playSound("guardian-rock-smash-impact.mp3", 0.65, 1, transformComponent.position);
            }
            break;
         }
         case GuardianAttackType.crystalBurst: {
            // If just starting, play charge sound
            if (this.attackType !== GuardianAttackType.crystalBurst) {
               const transformComponent = TransformComponentArray.getComponent(this.entity.id);
               playSound("guardian-rock-burst-charge.mp3", 0.4, 1, transformComponent.position);
            }

            // If starting burst, play burst sound
            if (this.attackStage === GuardianCrystalBurstStage.windup && attackStage === GuardianCrystalBurstStage.burst) {
               const transformComponent = TransformComponentArray.getComponent(this.entity.id);
               playSound("guardian-rock-burst.mp3", 0.7, 1, transformComponent.position);
            }
            break;
         }
         case GuardianAttackType.summonSpikyBalls: {
            // If just starting, play focus sound
            if (attackStage === GuardianSpikyBallSummonStage.focus && this.attackStage === GuardianSpikyBallSummonStage.windup) {
               const transformComponent = TransformComponentArray.getComponent(this.entity.id);
               playSound("guardian-summon-focus.mp3", 0.55, 1, transformComponent.position);
            }

            for (let i = 0; i < this.limbRenderParts.length; i++) {
               const renderPart = this.limbRenderParts[i];

               let shakeAmount: number;
               switch (attackStage) {
                  case GuardianSpikyBallSummonStage.windup: {
                     shakeAmount = Vars.SPIKY_BALL_SUMMON_SHAKE_AMOUNT * stageProgress;
                     break;
                  }
                  case GuardianSpikyBallSummonStage.focus: {
                     shakeAmount = Vars.SPIKY_BALL_SUMMON_SHAKE_AMOUNT;
                     break;
                  }
                  case GuardianSpikyBallSummonStage.return: {
                     shakeAmount = Vars.SPIKY_BALL_SUMMON_SHAKE_AMOUNT * (1 - stageProgress);
                     break;
                  }
                  default: {
                     throw new Error();
                  }
               }

               renderPart.shakeAmount = shakeAmount;
            }
            break;
         }
      }
      
      this.attackType = attackType;
      this.attackStage = attackStage;
   }
}

export const GuardianComponentArray = new ComponentArray<GuardianComponent>(ComponentArrayType.server, ServerComponentType.guardian, true, {});