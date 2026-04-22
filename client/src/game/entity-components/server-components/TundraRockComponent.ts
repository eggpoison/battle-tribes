import { ServerComponentType, PacketReader } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TundraRockComponentData {
   readonly variant: number;
}

export interface TundraRockComponent {
   readonly variant: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tundraRock, _TundraRockComponentArray, TundraRockComponentData> {}
}

class _TundraRockComponentArray extends _ServerComponentArray<TundraRockComponent, TundraRockComponentData> {
   public decodeData(reader: PacketReader): TundraRockComponentData {
      const variant = reader.readNumber();
      return {
         variant: variant
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tundraRockComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRock);
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/tundra-rock/rock-" + (tundraRockComponentData.variant + 1) + ".png")
      )
      if (tundraRockComponentData.variant === 0) {
         renderPart.angle = -Math.PI * 0.25;
      } else if (tundraRockComponentData.variant === 1) {
         renderPart.angle = -Math.PI * 0.25;
      } else if (tundraRockComponentData.variant === 2) {
         renderPart.angle = -Math.PI * 0.08;
      }
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(entityComponentData: EntityComponentData): TundraRockComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tundraRockComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRock);
      return {
         variant: tundraRockComponentData.variant
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const TundraRockComponentArray = registerServerComponentArray(ServerComponentType.tundraRock, _TundraRockComponentArray, true);