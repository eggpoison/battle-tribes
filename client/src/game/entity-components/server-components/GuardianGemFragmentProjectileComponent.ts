import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createGenericGemParticle } from "../../particles";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

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

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.guardianGemFragmentProjectile, _GuardianGemFragmentProjectileComponentArray, GuardianGemFragmentProjectileComponentData> {}
}

class _GuardianGemFragmentProjectileComponentArray extends _ServerComponentArray<GuardianGemFragmentProjectileComponent, GuardianGemFragmentProjectileComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): GuardianGemFragmentProjectileComponentData {
      const fragmentShape = reader.readNumber();
      const gemType = reader.readNumber();
      const baseTintMultiplier = reader.readNumber();

      return {
         fragmentShape: fragmentShape,
         gemType: gemType,
         baseTintMultiplier: baseTintMultiplier
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const guardianGemFragmentProjectileComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.guardianGemFragmentProjectile);
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
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

      renderObject.attachRenderPart(renderPart);

      return {
         renderPart: renderPart
      };
   }

   public createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): GuardianGemFragmentProjectileComponent {
      return {
         renderPart: intermediateInfo.renderPart
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onDie(entity: Entity): void {
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
}

export const GuardianGemFragmentProjectileComponentArray = registerServerComponentArray(ServerComponentType.guardianGemFragmentProjectile, _GuardianGemFragmentProjectileComponentArray, true);