import { ServerComponentType } from "../../../shared/src/components";
import { PacketReader } from "../../../shared/src/packets";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

const TEXTURE_SOURCES = [
   "entities/guardian-gem-fragment-projectile/fragment-1.png",
   "entities/guardian-gem-fragment-projectile/fragment-2.png",
   "entities/guardian-gem-fragment-projectile/fragment-3.png"
];

export class GuardianGemFragmentProjectileComponent extends ServerComponent {
   public padData(reader: PacketReader): void {
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader, isInitialData: boolean): void {
      const fragmentShape = reader.readNumber();
      const gemType = reader.readNumber();
      const baseTintMultiplier = reader.readNumber();

      if (isInitialData) {
         const renderPart = new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(TEXTURE_SOURCES[fragmentShape])
         );

         // Flip half of them
         if (Math.random() < 0.5) {
            renderPart.setFlipX(true);
         }

         const tintMultiplier = 0.85 * baseTintMultiplier;
         switch (gemType) {
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

         this.entity.attachRenderThing(renderPart);
      }
   }
}

export const GuardianGemFragmentProjectileComponentArray = new ComponentArray<GuardianGemFragmentProjectileComponent>(ComponentArrayType.server, ServerComponentType.guardianGemFragmentProjectile, true, {});