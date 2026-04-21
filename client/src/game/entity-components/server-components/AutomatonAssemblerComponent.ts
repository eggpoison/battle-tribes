import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface AutomatonAssemblerComponentData {}

export interface AutomatonAssemblerComponent {}

class _AutomatonAssemblerComponentArray extends ServerComponentArray<AutomatonAssemblerComponent, AutomatonAssemblerComponentData> {
   public decodeData(): AutomatonAssemblerComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            2,
            0,
            0, 0,
            getTextureArrayIndex("entities/automaton-assembler/automaton-assembler.png")
         )
      );

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/automaton-assembler/back.png")
         )
      );

      // Gear 1
      const gearRenderPart = new TexturedRenderPart(
         hitbox,
         1,
         Math.PI / 4,
         -64, 28,
         getTextureArrayIndex("entities/automaton-assembler/gear.png")
      );
      renderObject.attachRenderPart(gearRenderPart);

      // Gear 2
      const gear2RenderPart = new TexturedRenderPart(
         hitbox,
         1.5,
         Math.PI / 8,
         -24, 28,
         getTextureArrayIndex("entities/automaton-assembler/gear-2.png")
      );
      renderObject.attachRenderPart(gear2RenderPart);

      // Bottom gear
      const bottomGearRenderPart = new TexturedRenderPart(
         hitbox,
         1,
         -Math.PI / 8,
         20, -32,
         getTextureArrayIndex("entities/automaton-assembler/gear.png")
      );
      renderObject.attachRenderPart(bottomGearRenderPart);
   }

   public createComponent(): AutomatonAssemblerComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 5;
   }
}

export const AutomatonAssemblerComponentArray = registerServerComponentArray(ServerComponentType.automatonAssembler, _AutomatonAssemblerComponentArray, true);

export function createAutomatonAssemblerComponentData(): AutomatonAssemblerComponentData {
   return {};
}