import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createGenericGemParticle } from "../../particles";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianGemFragmentProjectileComponentData {
   readonly fragmentShape: number;
   readonly gemType: number;
   readonly baseTintMultiplier: number;
}

interface IntermediateInfo {
   readonly renderPart: VisualRenderPart;
}

export interface GuardianGemFragmentProjectileComponent {
   readonly renderPart: VisualRenderPart;
}

const TEXTURE_SOURCES = [
   "entities/guardian-gem-fragment-projectile/fragment-1.png",
   "entities/guardian-gem-fragment-projectile/fragment-2.png",
   "entities/guardian-gem-fragment-projectile/fragment-3.png"
];

export const GuardianGemFragmentProjectileComponentArray = new ServerComponentArray<GuardianGemFragmentProjectileComponent, GuardianGemFragmentProjectileComponentData, IntermediateInfo>(ServerComponentType.guardianGemFragmentProjectile, true, createComponent, getMaxRenderParts, decodeData);
GuardianGemFragmentProjectileComponentArray.populateIntermediateInfo = populateIntermediateInfo;
GuardianGemFragmentProjectileComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): GuardianGemFragmentProjectileComponentData {
   const fragmentShape = reader.readNumber();
   const gemType = reader.readNumber();
   const baseTintMultiplier = reader.readNumber();

   return {
      fragmentShape: fragmentShape,
      gemType: gemType,
      baseTintMultiplier: baseTintMultiplier
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const guardianGemFragmentProjectileComponentData = entityComponentData.serverComponentData[ServerComponentType.guardianGemFragmentProjectile]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(TEXTURE_SOURCES[guardianGemFragmentProjectileComponentData.fragmentShape])
   );

   // Flip half of them
   if (Math.random() < 0.5) {
      renderPart.setFlipX(true);
   }

   const tintMultiplier = 0.85 * guardianGemFragmentProjectileComponentData.baseTintMultiplier;
   switch (guardianGemFragmentProjectileComponentData.gemType) {
      // Ruby
      case 0: {
         renderPart.tintR = tintMultiplier;
         break;
      }
      // Emerald
      case 1: {
         renderPart.tintG = tintMultiplier;
         break;
      }
      // Amethyst
      case 2: {
         renderPart.tintR = 0.9 * tintMultiplier;
         renderPart.tintG = 0.2 * tintMultiplier;
         renderPart.tintB = 0.9 * tintMultiplier;
         break;
      }
   }

   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): GuardianGemFragmentProjectileComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 3; i++) {
      createGenericGemParticle(hitbox, 4, guardianGemFragmentProjectileComponent.renderPart.tintR, guardianGemFragmentProjectileComponent.renderPart.tintG, guardianGemFragmentProjectileComponent.renderPart.tintB);
   }

   if (Math.random() < 0.5) {
      playSoundOnHitbox("guardian-gem-fragment-death.mp3", 0.3, 1, entity, hitbox, false);
   }
}