import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { createGenericGemParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponent from "../ServerComponent";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

const TEXTURE_SOURCES = [
   "entities/guardian-gem-fragment-projectile/fragment-1.png",
   "entities/guardian-gem-fragment-projectile/fragment-2.png",
   "entities/guardian-gem-fragment-projectile/fragment-3.png"
];

export class GuardianGemFragmentProjectileComponent extends ServerComponent {
   public renderPart!: TexturedRenderPart;
}

export const GuardianGemFragmentProjectileComponentArray = new ServerComponentArray<GuardianGemFragmentProjectileComponent>(ServerComponentType.guardianGemFragmentProjectile, true, {
   onDie: onDie,
   padData: padData,
   updateFromData: updateFromData
});

function onDie(entity: EntityID): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 3; i++) {
      createGenericGemParticle(transformComponent, 4, guardianGemFragmentProjectileComponent.renderPart.tintR, guardianGemFragmentProjectileComponent.renderPart.tintG, guardianGemFragmentProjectileComponent.renderPart.tintB);
   }

   if (Math.random() < 0.5) {
      playSound("guardian-gem-fragment-death.mp3", 0.3, 1, transformComponent.position);
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID, isInitialData: boolean): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   
   const fragmentShape = reader.readNumber();
   const gemType = reader.readNumber();
   const baseTintMultiplier = reader.readNumber();

   if (isInitialData) {
      guardianGemFragmentProjectileComponent.renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(TEXTURE_SOURCES[fragmentShape])
      );

      // Flip half of them
      if (Math.random() < 0.5) {
         guardianGemFragmentProjectileComponent.renderPart.setFlipX(true);
      }

      const tintMultiplier = 0.85 * baseTintMultiplier;
      switch (gemType) {
         // Ruby
         case 0: {
            guardianGemFragmentProjectileComponent.renderPart.tintR = tintMultiplier;
            break;
         }
         // Emerald
         case 1: {
            guardianGemFragmentProjectileComponent.renderPart.tintG = tintMultiplier;
            break;
         }
         // Amethyst
         case 2: {
            guardianGemFragmentProjectileComponent.renderPart.tintR = 0.9 * tintMultiplier;
            guardianGemFragmentProjectileComponent.renderPart.tintG = 0.2 * tintMultiplier;
            guardianGemFragmentProjectileComponent.renderPart.tintB = 0.9 * tintMultiplier;
            break;
         }
      }

      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.attachRenderThing(guardianGemFragmentProjectileComponent.renderPart);
   }
}