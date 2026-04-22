import { HitboxFlag, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface FenceGateComponentData {}

export interface FenceGateComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fenceGate, _FenceGateComponentArray, FenceGateComponentData> {}
}

class _FenceGateComponentArray extends _ServerComponentArray<FenceGateComponent, FenceGateComponentData> {
   public decodeData(): FenceGateComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      
      for (const hitbox of transformComponent.hitboxes) {
         if (hitbox.flags.includes(HitboxFlag.FENCE_GATE_DOOR)) {
            renderObject.attachRenderPart(
                  new TexturedRenderPart(
                  hitbox,
                  1,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/fence-gate/door.png")
               )
            );
         } else {
            renderObject.attachRenderPart(
                  new TexturedRenderPart(
                  hitbox,
                  0,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/fence-gate/side.png")
               )
            );
         }
      }
   }

   public createComponent(): FenceGateComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 3;
   }
}

export const FenceGateComponentArray = registerServerComponentArray(ServerComponentType.fenceGate, _FenceGateComponentArray, true);

export function createFenceGateComponentData(): FenceGateComponentData {
   return {};
}