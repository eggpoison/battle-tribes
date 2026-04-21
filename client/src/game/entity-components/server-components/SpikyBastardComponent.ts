import { randInt, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface SpikyBastardComponentData {}

export interface SpikyBastardComponent {}

class _SpikyBastardComponentArray extends ServerComponentArray<SpikyBastardComponent, SpikyBastardComponentData> {
   public decodeData(): SpikyBastardComponentData {
      return createSpikyBastardComponentData();
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponent.hitboxes[0];
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/spiky-bastard/spiky-bastard-" + randInt(1, 3) + ".png")
      );
      if (Math.random() < 0.5) {
         renderPart.setFlipX(true);
      }
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): SpikyBastardComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const SpikyBastardComponentArray = registerServerComponentArray(ServerComponentType.spikyBastard, _SpikyBastardComponentArray, true);

export function createSpikyBastardComponentData(): SpikyBastardComponentData {
   return {};
}