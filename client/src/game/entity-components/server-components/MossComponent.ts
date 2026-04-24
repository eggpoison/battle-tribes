import { randFloat, PacketReader, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface MossComponentData {
   readonly size: number;
   readonly colour: number;
}

export interface MossComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.moss, _MossComponentArray> {}
}

class _MossComponentArray extends _ServerComponentArray<MossComponent, MossComponentData> {
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

      let colourString: string;
      switch (mossComponentData.colour) {
         case 0: colourString = "light-green"; break;
         case 1: colourString = "dark-green"; break;
         case 2: colourString = "aqua"; break;
         case 3: colourString = "red"; break;
         case 4: colourString = "purple"; break;
         case 5: colourString = "gold"; break;
         default: throw new Error();
      }
      
      let textureSource: string;
      switch (mossComponentData.size) {
         case 0: textureSource = "entities/moss/" + colourString + "/moss-small.png"; break;
         case 1: textureSource = "entities/moss/" + colourString + "/moss-medium.png"; break;
         case 2: textureSource = "entities/moss/" + colourString + "/moss-large.png"; break;
         default: throw new Error();
      }

      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex(textureSource)
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