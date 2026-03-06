import { randFloat, PacketReader, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData, getTransformComponentData } from "../../networking/packet-snapshots";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface MossComponentData {
   readonly size: number;
   readonly colour: number;
}

interface IntermediateInfo {}

export interface MossComponent {}

export const MossComponentArray = new ServerComponentArray<MossComponent, MossComponentData, IntermediateInfo>(ServerComponentType.moss, true, createComponent, getMaxRenderParts, decodeData);
MossComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(reader: PacketReader): MossComponentData {
   const size = reader.readNumber();
   const colour = reader.readNumber();
   return {
      size: size,
      colour: colour
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
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
      getTextureArrayIndex(textureSource)
   );
   renderPart.tintR = randFloat(-0.04, 0.04);
   renderPart.tintG = randFloat(-0.04, 0.04);
   renderPart.tintB = randFloat(-0.04, 0.04);
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): MossComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}