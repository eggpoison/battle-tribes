import { ServerComponentType } from "../../../../../shared/src/components";
import { PacketReader } from "../../../../../shared/src/packets";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SandstoneRockComponentData {
   readonly size: number;
}

export interface SandstoneRockComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.sandstoneRock, _SandstoneRockComponentArray> {}
}

class _SandstoneRockComponentArray extends _ServerComponentArray<SandstoneRockComponent, SandstoneRockComponentData> {
   public decodeData(reader: PacketReader): SandstoneRockComponentData {
      const size = reader.readNumber();
      return {
         size: size
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const sandstoneRockComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.sandstoneRock);

      let textureIndexOffset: number;
      switch (sandstoneRockComponentData.size) {
         case 0: textureIndexOffset = 2; break;
         case 1: textureIndexOffset = 1; break;
         case 2: textureIndexOffset = 0; break;
         default: throw new Error();
      }
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            TextureIndex.entities_sandstoneRock_sandstoneRockLarge + textureIndexOffset
         )
      );
   }

   public createComponent(): SandstoneRockComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const SandstoneRockComponentArray = registerServerComponentArray(ServerComponentType.sandstoneRock, _SandstoneRockComponentArray, true);