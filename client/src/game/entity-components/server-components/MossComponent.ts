import { ServerComponentType } from "../../../../../shared/src/components";
import { PacketReader } from "../../../../../shared/src/packets";
import { randFloat } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface MossComponentData {
   readonly size: number;
   readonly colour: number;
}

export interface MossComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.moss, _MossComponentArray> {}
}

class _MossComponentArray extends ServerComponentArray<MossComponent, MossComponentData> {
   public decodeData(reader: PacketReader): MossComponentData {
      const size = reader.readNumber();
      const colour = reader.readNumber();
      return {
         size: size,
         colour: colour
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const mossComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.moss);

      let colourTextureIndex: TextureIndex;
      switch (mossComponentData.colour) {
         case 0: colourTextureIndex = TextureIndex.entities_moss_lightGreen_mossLarge; break;
         case 1: colourTextureIndex = TextureIndex.entities_moss_darkGreen_mossLarge; break;
         case 2: colourTextureIndex = TextureIndex.entities_moss_aqua_mossLarge; break;
         case 3: colourTextureIndex = TextureIndex.entities_moss_red_mossLarge; break;
         case 4: colourTextureIndex = TextureIndex.entities_moss_purple_mossLarge; break;
         case 5: colourTextureIndex = TextureIndex.entities_moss_gold_mossLarge; break;
         default: throw new Error();
      }

      const textureIndex = colourTextureIndex + mossComponentData.size;

      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         textureIndex
      );
      renderPart.tintR = randFloat(-0.04, 0.04);
      renderPart.tintG = randFloat(-0.04, 0.04);
      renderPart.tintB = randFloat(-0.04, 0.04);
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): MossComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const MossComponentArray = registerServerComponentArray(ServerComponentType.moss, _MossComponentArray, true);