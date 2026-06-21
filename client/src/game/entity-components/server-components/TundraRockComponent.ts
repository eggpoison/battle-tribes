import { ServerComponentType } from "../../../../../shared/src/components";
import { PacketReader } from "../../../../../shared/src/packets";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface TundraRockComponentData {
   readonly variant: number;
}

export interface TundraRockComponent {
   readonly variant: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tundraRock, _TundraRockComponentArray> {}
}

class _TundraRockComponentArray extends ServerComponentArray<TundraRockComponent, TundraRockComponentData> {
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
         TextureIndex.entities_tundraRock_rock1 + tundraRockComponentData.variant
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