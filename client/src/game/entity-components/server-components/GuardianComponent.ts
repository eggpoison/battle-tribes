import { GuardianAttackType, GuardianCrystalBurstStage, GuardianCrystalSlamStage, GuardianSpikyBallSummonStage, ServerComponentType, lerp, PacketReader, Entity, HitboxFlag } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Light } from "../../lights";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { registerDirtyRenderObject } from "../../rendering/render-part-matrices";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { setRenderPartShakeAmount } from "../../render-parts/render-part-shake-amounts";

export interface GuardianComponentData {
   readonly rubyGemActivation: number;
   readonly emeraldGemActivation: number;

   readonly amethystGemActivation: number;
   readonly limbRubyGemActivation: number;
   readonly limbEmeraldGemActivation: number;
   readonly limbAmethystGemActivation: number;

   readonly attackType: number;
   readonly attackStage: number;
   readonly stageProgress: number;
}

interface IntermediateInfo {
   rubyRenderParts: Array<VisualRenderPart>,
   amethystRenderParts: Array<VisualRenderPart>,
   emeraldRenderParts: Array<VisualRenderPart>,
   rubyLights: Array<[number, Light]>,
   emeraldLights: Array<[number, Light]>,
   amethystLights: Array<[number, Light]>,
   limbRenderParts: Array<VisualRenderPart>,
   limbCrackRenderParts: Array<VisualRenderPart>,
   limbCrackLights: Array<Light>,
}

export interface GuardianComponent {
   readonly rubyRenderParts: Array<VisualRenderPart>;
   readonly amethystRenderParts: Array<VisualRenderPart>;
   readonly emeraldRenderParts: Array<VisualRenderPart>;

   readonly rubyLights: Array<[number, Light]>;
   readonly emeraldLights: Array<[number, Light]>;
   readonly amethystLights: Array<[number, Light]>;

   rubyGemActivation: number;
   emeraldGemActivation: number;
   amethystGemActivation: number;

   readonly limbRenderParts: Array<VisualRenderPart>;
   readonly limbCrackRenderParts: Array<VisualRenderPart>;
   readonly limbCrackLights: Array<Light>;

   limbRubyGemActivation: number;
   limbEmeraldGemActivation: number;
   limbAmethystGemActivation: number;

   attackType: GuardianAttackType;
   attackStage: number;
}

const enum Vars {
   SPIKY_BALL_SUMMON_SHAKE_AMOUNT = 2
}

export const GuardianComponentArray = new ServerComponentArray<GuardianComponent, GuardianComponentData, IntermediateInfo>(ServerComponentType.guardian, true, createComponent, getMaxRenderParts, decodeData);
GuardianComponentArray.populateIntermediateInfo = populateIntermediateInfo;
GuardianComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): GuardianComponentData {
   const rubyGemActivation = reader.readNumber();
   const emeraldGemActivation = reader.readNumber();
   const amethystGemActivation = reader.readNumber();

   const limbRubyGemActivation = reader.readNumber();
   const limbEmeraldGemActivation = reader.readNumber();
   const limbAmethystGemActivation = reader.readNumber();

   const attackType = reader.readNumber();
   const attackStage = reader.readNumber();
   const stageProgress = reader.readNumber();

   return {
      rubyGemActivation: rubyGemActivation,
      emeraldGemActivation: emeraldGemActivation,
      amethystGemActivation: amethystGemActivation,
      limbRubyGemActivation: limbRubyGemActivation,
      limbEmeraldGemActivation: limbEmeraldGemActivation,
      limbAmethystGemActivation: limbAmethystGemActivation,
      attackType: attackType,
      attackStage: attackStage,
      stageProgress: stageProgress
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponent.hitboxes[0];
   
   const rubyRenderParts = new Array<VisualRenderPart>();
   const amethystRenderParts = new Array<VisualRenderPart>();
   const emeraldRenderParts = new Array<VisualRenderPart>();

   const rubyLights = new Array<[number, Light]>();
   const emeraldLights = new Array<[number, Light]>();
   const amethystLights = new Array<[number, Light]>();

   // Body

   const bodyRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      0, 0,
      getTextureArrayIndex("entities/guardian/guardian-body.png")
   );
   renderObject.attachRenderPart(bodyRenderPart);

   const bodyAmethystsRenderPart = new TexturedRenderPart(
      bodyRenderPart,
      1.1,
      0,
      0, 0,
      getTextureArrayIndex("entities/guardian/guardian-body-amethysts.png")
   );
   renderObject.attachRenderPart(bodyAmethystsRenderPart);
   amethystRenderParts.push(bodyAmethystsRenderPart);

   const bodyEmeraldsRenderPart = new TexturedRenderPart(
      bodyRenderPart,
      1.1,
      0,
      0, 0,
      getTextureArrayIndex("entities/guardian/guardian-body-emeralds.png")
   );
   renderObject.attachRenderPart(bodyEmeraldsRenderPart);
   emeraldRenderParts.push(bodyEmeraldsRenderPart);

   // Head
   
   const headRenderPart = new TexturedRenderPart(
      bodyRenderPart,
      2,
      0,
      0, 28,
      getTextureArrayIndex("entities/guardian/guardian-head.png")
   );
   renderObject.attachRenderPart(headRenderPart);
   
   const headRubies = new TexturedRenderPart(
      headRenderPart,
      2.1,
      0,
      0, 0,
      getTextureArrayIndex("entities/guardian/guardian-head-rubies.png")
   );
   renderObject.attachRenderPart(headRubies);
   rubyRenderParts.push(headRubies);

   const limbRenderParts = new Array<VisualRenderPart>();
   const limbCrackRenderParts = new Array<VisualRenderPart>();
   const limbCrackLights = new Array<Light>();
   
   // Attach limb render parts
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];
      
      if (hitbox.flags.includes(HitboxFlag.GUARDIAN_LIMB_HITBOX)) {
         const limbRenderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/guardian/guardian-limb.png")
         );
         renderObject.attachRenderPart(limbRenderPart);
         limbRenderParts.push(limbRenderPart);

         const cracksRenderPart = new TexturedRenderPart(
            limbRenderPart,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/guardian/guardian-limb-gem-cracks.png")
         );
         renderObject.attachRenderPart(cracksRenderPart);
         limbCrackRenderParts.push(cracksRenderPart);

         // @INCOMPLETE
         // const light = createLight(
         //    new Point(0, 0),
         //    0.5,
         //    0.3,
         //    12,
         //    0,
         //    0,
         //    0
         // );
         // limbCrackLights.push(light);
         // intermediateInfo.lights.push({
         //    light: light,
         //    attachedRenderPart: cracksRenderPart
         // });
      }
   }

   return {
      rubyRenderParts: rubyRenderParts,
      amethystRenderParts: amethystRenderParts,
      emeraldRenderParts: emeraldRenderParts,
      rubyLights: rubyLights,
      emeraldLights: emeraldLights,
      amethystLights: amethystLights,
      limbRenderParts: limbRenderParts,
      limbCrackRenderParts: limbCrackRenderParts,
      limbCrackLights: limbCrackLights
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): GuardianComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const guardianComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.guardian);

   return {
      rubyRenderParts: intermediateInfo.rubyRenderParts,
      amethystRenderParts: intermediateInfo.amethystRenderParts,
      emeraldRenderParts: intermediateInfo.emeraldRenderParts,
      rubyLights: intermediateInfo.rubyLights,
      emeraldLights: intermediateInfo.emeraldLights,
      amethystLights: intermediateInfo.amethystLights,
      rubyGemActivation: guardianComponentData.rubyGemActivation,
      emeraldGemActivation: guardianComponentData.emeraldGemActivation,
      amethystGemActivation: guardianComponentData.amethystGemActivation,
      limbRenderParts: intermediateInfo.limbRenderParts,
      limbCrackRenderParts: intermediateInfo.limbCrackRenderParts,
      limbCrackLights: intermediateInfo.limbCrackLights,
      limbRubyGemActivation: guardianComponentData.limbRubyGemActivation,
      limbEmeraldGemActivation: guardianComponentData.limbEmeraldGemActivation,
      limbAmethystGemActivation: guardianComponentData.limbAmethystGemActivation,
      attackType: guardianComponentData.attackType,
      attackStage: guardianComponentData.attackStage
   };
}

function getMaxRenderParts(entityComponentData: EntityComponentData): number {
   let maxRenderParts = 5;
   
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   maxRenderParts += 2 * transformComponentData.hitboxes.length;

   return maxRenderParts;
}
   
const setColours = (renderParts: ReadonlyArray<VisualRenderPart>, lights: ReadonlyArray<[number, Light]>, activation: number, tintR: number, tintG: number, tintB: number): void => {
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

function updateFromData(data: GuardianComponentData, entity: Entity): void {
   const guardianComponent = GuardianComponentArray.getComponent(entity);
   
   const rubyGemActivation = data.rubyGemActivation;
   const emeraldGemActivation = data.emeraldGemActivation;
   const amethystGemActivation = data.amethystGemActivation;

   const limbRubyGemActivation = data.rubyGemActivation;
   const limbEmeraldGemActivation = data.emeraldGemActivation;
   const limbAmethystGemActivation = data.amethystGemActivation;

   const attackType = data.attackType;
   const attackStage = data.attackStage;
   const stageProgress = data.stageProgress;

   const actualRubyGemActivation = lerp(rubyGemActivation, 1, limbRubyGemActivation);
   if (actualRubyGemActivation !== guardianComponent.rubyGemActivation) {
      setColours(guardianComponent.rubyRenderParts, guardianComponent.rubyLights, actualRubyGemActivation, actualRubyGemActivation, 0, 0);
      const renderObject = getEntityRenderObject(entity);
      registerDirtyRenderObject(renderObject);
   }
   const actualEmeraldGemActivation = lerp(emeraldGemActivation, 1, limbEmeraldGemActivation);
   if (actualEmeraldGemActivation !== guardianComponent.emeraldGemActivation) {
      setColours(guardianComponent.emeraldRenderParts, guardianComponent.emeraldLights, actualEmeraldGemActivation, 0, actualEmeraldGemActivation, 0);
      const renderObject = getEntityRenderObject(entity);
      registerDirtyRenderObject(renderObject);
   }
   const actualAmethystGemActivation = lerp(amethystGemActivation, 1, limbAmethystGemActivation);
   if (actualAmethystGemActivation !== guardianComponent.amethystGemActivation) {
      setColours(guardianComponent.amethystRenderParts, guardianComponent.amethystLights, actualAmethystGemActivation, actualAmethystGemActivation * 0.9, actualAmethystGemActivation * 0.2, actualAmethystGemActivation * 0.9);
      const renderObject = getEntityRenderObject(entity);
      registerDirtyRenderObject(renderObject);
   }

   guardianComponent.rubyGemActivation = actualRubyGemActivation;
   guardianComponent.emeraldGemActivation = actualEmeraldGemActivation;
   guardianComponent.amethystGemActivation = actualAmethystGemActivation;

   if (limbRubyGemActivation !== guardianComponent.limbRubyGemActivation || limbEmeraldGemActivation !== guardianComponent.limbEmeraldGemActivation || limbAmethystGemActivation !== guardianComponent.limbAmethystGemActivation) {
      for (let i = 0; i < guardianComponent.limbCrackRenderParts.length; i++) {
         const renderPart = guardianComponent.limbCrackRenderParts[i];
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

         const light = guardianComponent.limbCrackLights[i];
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
      const renderObject = getEntityRenderObject(entity);
      registerDirtyRenderObject(renderObject);
   }

   guardianComponent.limbRubyGemActivation = limbRubyGemActivation;
   guardianComponent.limbEmeraldGemActivation = limbEmeraldGemActivation;
   guardianComponent.limbAmethystGemActivation = limbAmethystGemActivation;

   for (let i = 0; i < guardianComponent.limbRenderParts.length; i++) {
      const renderPart = guardianComponent.limbRenderParts[i];
      setRenderPartShakeAmount(renderPart, 0);
   }
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   switch (attackType) {
      case GuardianAttackType.crystalSlam: {
         // If just starting the slam, play charge sound
         if (guardianComponent.attackType !== GuardianAttackType.crystalSlam) {
            playSoundOnHitbox("guardian-rock-smash-charge.mp3", 0.4, 1, entity, hitbox, true);
         }

         // If starting slam, play start sound
         if (guardianComponent.attackStage === GuardianCrystalSlamStage.windup && attackStage === GuardianCrystalSlamStage.slam) {
            playSoundOnHitbox("guardian-rock-smash-start.mp3", 0.2, 1, entity, hitbox, false);
         }
         
         // If going from slam to return, then play the slam sound
         if (guardianComponent.attackStage === GuardianCrystalSlamStage.slam && attackStage === GuardianCrystalSlamStage.return) {
            playSoundOnHitbox("guardian-rock-smash-impact.mp3", 0.65, 1, entity, hitbox, false);
         }
         break;
      }
      case GuardianAttackType.crystalBurst: {
         // If just starting, play charge sound
         if (guardianComponent.attackType !== GuardianAttackType.crystalBurst) {
            playSoundOnHitbox("guardian-rock-burst-charge.mp3", 0.4, 1, entity, hitbox, true);
         }

         // If starting burst, play burst sound
         if (guardianComponent.attackStage === GuardianCrystalBurstStage.windup && attackStage === GuardianCrystalBurstStage.burst) {
            playSoundOnHitbox("guardian-rock-burst.mp3", 0.7, 1, entity, hitbox, false);
         }
         break;
      }
      case GuardianAttackType.summonSpikyBalls: {
         // If just starting, play focus sound
         if (attackStage === GuardianSpikyBallSummonStage.focus && guardianComponent.attackStage === GuardianSpikyBallSummonStage.windup) {
            playSoundOnHitbox("guardian-summon-focus.mp3", 0.55, 1, entity, hitbox, true);
         }

         for (let i = 0; i < guardianComponent.limbRenderParts.length; i++) {
            const renderPart = guardianComponent.limbRenderParts[i];

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

            setRenderPartShakeAmount(renderPart, shakeAmount);
         }
         break;
      }
   }
   
   guardianComponent.attackType = attackType;
   guardianComponent.attackStage = attackStage;
}