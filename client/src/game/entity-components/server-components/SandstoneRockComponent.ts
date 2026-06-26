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

export interface SandstoneRockComponentData {
   readonly size: number;
}

export interface SandstoneRockComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.sandstoneRock, typeof SandstoneRockComponentArray> {}
}

export const SandstoneRockComponentArray = registerServerComponentArray(
   ServerComponentType.sandstoneRock,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SandstoneRockComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(reader: PacketReader): SandstoneRockComponentData {
   const size = reader.readNumber();
   return {
      size: size
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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

function createComponent(): SandstoneRockComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}