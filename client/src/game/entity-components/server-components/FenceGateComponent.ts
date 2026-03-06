import { HitboxFlag, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getTransformComponentData } from "../../networking/packet-snapshots";

export interface FenceGateComponentData {}

interface IntermediateInfo {}

export interface FenceGateComponent {}

export const FenceGateComponentArray = new ServerComponentArray<FenceGateComponent, FenceGateComponentData, IntermediateInfo>(ServerComponentType.fenceGate, true, createComponent, getMaxRenderParts, decodeData);
FenceGateComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createFenceGateComponentData(): FenceGateComponentData {
   return {};
}

function decodeData(): FenceGateComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
   
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.FENCE_GATE_DOOR)) {
         renderInfo.attachRenderPart(
               new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/fence-gate/door.png")
            )
         );
      } else {
         renderInfo.attachRenderPart(
               new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/fence-gate/side.png")
            )
         );
      }
   }

   return {};
}

function createComponent(): FenceGateComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}