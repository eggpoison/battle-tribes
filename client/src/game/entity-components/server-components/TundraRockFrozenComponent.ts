import { ServerComponentType, PacketReader } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TundraRockFrozenComponentData {
   readonly variant: number;
}

export interface TundraRockFrozenComponent {
   readonly variant: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tundraRockFrozen, _TundraRockFrozenComponentArray, TundraRockFrozenComponentData> {}
}

class _TundraRockFrozenComponentArray extends _ServerComponentArray<TundraRockFrozenComponent, TundraRockFrozenComponentData> {
   public decodeData(reader: PacketReader): TundraRockFrozenComponentData {
      const variant = reader.readNumber();
      return {
         variant: variant
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tundraRockFrozenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRockFrozen);
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/tundra-rock-frozen/rock-" + (tundraRockFrozenComponentData.variant + 1) + ".png")
      )
      if (tundraRockFrozenComponentData.variant === 0) {
         renderPart.angle = -Math.PI * 0.25;
      } else if (tundraRockFrozenComponentData.variant === 1) {
         renderPart.angle = -Math.PI * 0.25;
      } else if (tundraRockFrozenComponentData.variant === 2) {
         renderPart.angle = -Math.PI * 0.08;
      }
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(entityComponentData: EntityComponentData): TundraRockFrozenComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tundraRockFrozenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRockFrozen);
      return {
         variant: tundraRockFrozenComponentData.variant
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const TundraRockFrozenComponentArray = registerServerComponentArray(ServerComponentType.tundraRockFrozen, _TundraRockFrozenComponentArray, true);