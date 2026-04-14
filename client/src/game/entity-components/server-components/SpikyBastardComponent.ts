import { randInt, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";

export interface SpikyBastardComponentData {}

interface IntermediateInfo {}

export interface SpikyBastardComponent {}

export const SpikyBastardComponentArray = new ServerComponentArray<SpikyBastardComponent, SpikyBastardComponentData, IntermediateInfo>(ServerComponentType.spikyBastard, true, createComponent, getMaxRenderParts, decodeData);
SpikyBastardComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createSpikyBastardComponentData(): SpikyBastardComponentData {
   return {};
}

function decodeData(): SpikyBastardComponentData {
   return createSpikyBastardComponentData();
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
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

   return {};
}

function createComponent(): SpikyBastardComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}