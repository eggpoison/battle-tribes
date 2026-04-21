import { randAngle, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface DustfleaEggComponentData {}

export interface DustfleaEggComponent {}

class _DustfleaEggComponentArray extends ServerComponentArray<DustfleaEggComponent, DustfleaEggComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const renderPart = new TexturedRenderPart(
         hitbox,
         1,
         0,
         0, 0,
         getTextureArrayIndex("entities/dustflea-egg/dustflea-egg.png")
      );
      renderObject.attachRenderPart(renderPart);

      const dustfleaRenderPart = new TexturedRenderPart(
         hitbox,
         0,
         randAngle(), // @Sync
         0, 0,
         getTextureArrayIndex("entities/dustflea/dustflea.png")
      );
      dustfleaRenderPart.inheritParentRotation = false;
      renderObject.attachRenderPart(dustfleaRenderPart);
   }

   public decodeData(): DustfleaEggComponentData {
      return createDustfleaEggComponentData();
   }

   public createComponent(): DustfleaEggComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 2;
   }
}

export const DustfleaEggComponentArray = registerServerComponentArray(ServerComponentType.dustfleaEgg, _DustfleaEggComponentArray, true);

export function createDustfleaEggComponentData(): DustfleaEggComponentData {
   return {};
}