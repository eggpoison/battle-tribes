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
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fenceGate, typeof FenceGateComponentArray> {}
}

export const FenceGateComponentArray = registerServerComponentArray(
   ServerComponentType.fenceGate,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): FenceGateComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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

function createComponent(): FenceGateComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

export function createFenceGateComponentData(): FenceGateComponentData {
   return {};
}