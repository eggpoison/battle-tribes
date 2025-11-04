import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface SandstoneRockComponentData {
   readonly size: number;
}

interface IntermediateInfo {}

export interface SandstoneRockComponent {}

export const SandstoneRockComponentArray = new ServerComponentArray<SandstoneRockComponent, SandstoneRockComponentData, IntermediateInfo>(ServerComponentType.sandstoneRock, true, createComponent, getMaxRenderParts, decodeData);
SandstoneRockComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(reader: PacketReader): SandstoneRockComponentData {
   const size = reader.readNumber();
   return {
      size: size
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const sandstoneRockComponentData = entityComponentData.serverComponentData[ServerComponentType.sandstoneRock]!;

   let typeString: string;
   switch (sandstoneRockComponentData.size) {
      case 0: typeString = "small"; break;
      case 1: typeString = "medium"; break;
      case 2: typeString = "large"; break;
      default: throw new Error();
   }
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/sandstone-rock/sandstone-rock-" + typeString + ".png")
      )
   );

   return {};
}

function createComponent(): SandstoneRockComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}