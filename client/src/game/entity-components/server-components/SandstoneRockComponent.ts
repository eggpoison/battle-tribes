import { ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const sandstoneRockComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.sandstoneRock);

   let typeString: string;
   switch (sandstoneRockComponentData.size) {
      case 0: typeString = "small"; break;
      case 1: typeString = "medium"; break;
      case 2: typeString = "large"; break;
      default: throw new Error();
   }
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
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