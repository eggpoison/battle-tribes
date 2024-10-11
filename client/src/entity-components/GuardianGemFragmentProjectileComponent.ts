import { ServerComponentType } from "../../../shared/src/components";
import { PacketReader } from "../../../shared/src/packets";
import { createGenericGemParticle } from "../particles";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { playSound } from "../sound";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";
import { TransformComponentArray } from "./TransformComponent";

const TEXTURE_SOURCES = [
   "entities/guardian-gem-fragment-projectile/fragment-1.png",
   "entities/guardian-gem-fragment-projectile/fragment-2.png",
   "entities/guardian-gem-fragment-projectile/fragment-3.png"
];

export class GuardianGemFragmentProjectileComponent extends ServerComponent {
   private renderPart!: TexturedRenderPart;
   
   public padData(reader: PacketReader): void {
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader, isInitialData: boolean): void {
      const fragmentShape = reader.readNumber();
      const gemType = reader.readNumber();
      const baseTintMultiplier = reader.readNumber();

      if (isInitialData) {
         this.renderPart = new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(TEXTURE_SOURCES[fragmentShape])
         );

         // Flip half of them
         if (Math.random() < 0.5) {
            this.renderPart.setFlipX(true);
         }

         const tintMultiplier = 0.85 * baseTintMultiplier;
         switch (gemType) {
            // Ruby
            case 0: {
               this.renderPart.tintR = tintMultiplier;
               break;
            }
            // Emerald
            case 1: {
               this.renderPart.tintG = tintMultiplier;
               break;
            }
            // Amethyst
            case 2: {
               this.renderPart.tintR = 0.9 * tintMultiplier;
               this.renderPart.tintG = 0.2 * tintMultiplier;
               this.renderPart.tintB = 0.9 * tintMultiplier;
               break;
            }
         }

         this.entity.attachRenderThing(this.renderPart);
      }
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.entity.id);
      for (let i = 0; i < 3; i++) {
         createGenericGemParticle(transformComponent, 4, this.renderPart.tintR, this.renderPart.tintG, this.renderPart.tintB);
      }

      if (Math.random() < 0.5) {
         playSound("guardian-gem-fragment-death.mp3", 0.3, 1, transformComponent.position);
      }
   }
}

export const GuardianGemFragmentProjectileComponentArray = new ComponentArray<GuardianGemFragmentProjectileComponent>(ComponentArrayType.server, ServerComponentType.guardianGemFragmentProjectile, true, {});