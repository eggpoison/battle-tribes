import { ServerComponentType } from "../../../../../shared/src/components";
import { randInt } from "../../../../../shared/src/utils";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SpikyBastardComponentData {}

export interface SpikyBastardComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.spikyBastard, _SpikyBastardComponentArray> {}
}

class _SpikyBastardComponentArray extends _ServerComponentArray<SpikyBastardComponent, SpikyBastardComponentData> {
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
         // @Parity
         TextureIndex.entities_spikyBastard_spikyBastard1 + randInt(0, 2)
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