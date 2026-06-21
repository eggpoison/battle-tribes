import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { getHitboxTag } from "../../hitboxes";
import { TextureIndex } from "../../../texture-index";

export interface FenceGateComponentData {}

export interface FenceGateComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fenceGate, _FenceGateComponentArray> {}
}

class _FenceGateComponentArray extends ServerComponentArray<FenceGateComponent, FenceGateComponentData> {
   public decodeData(): FenceGateComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      
      for (const hitbox of transformComponent.hitboxes) {
         if (getHitboxTag(hitbox) === HitboxTag.fenceGateDoor) {
            renderObject.attachRenderPart(
                  new TexturedRenderPart(
                  hitbox,
                  1,
                  0,
                  0, 0,
                  TextureIndex.entities_fenceGate_door
               )
            );
         } else {
            renderObject.attachRenderPart(
                  new TexturedRenderPart(
                  hitbox,
                  0,
                  0,
                  0, 0,
                  TextureIndex.entities_fenceGate_side
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