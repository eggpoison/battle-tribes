import { PacketReader } from "battletribes-shared/packets";
import { DecorationType } from "battletribes-shared/components";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface DecorationComponentData {
   readonly decorationType: DecorationType;
}

interface IntermediateInfo {}

export interface DecorationComponent {
   readonly decorationType: DecorationType;
}

const DECORATION_RENDER_INFO: Record<DecorationType, string> = {
   [DecorationType.pebble]: "decorations/pebble.png",
   [DecorationType.rock]: "decorations/rock1.png",
   [DecorationType.sandstoneRock]: "decorations/sandstone-rock.png",
   [DecorationType.sandstoneRockBig1]: "decorations/sandstone-rock-big1.png",
   [DecorationType.sandstoneRockBig2]: "decorations/sandstone-rock-big2.png",
   [DecorationType.sandstoneRockDark]: "decorations/sandstone-rock-dark.png",
   [DecorationType.sandstoneRockDarkBig1]: "decorations/sandstone-rock-dark-big1.png",
   [DecorationType.sandstoneRockDarkBig2]: "decorations/sandstone-rock-dark-big2.png",
   [DecorationType.flower1]: "decorations/flower1.png",
   [DecorationType.flower2]: "decorations/flower2.png",
   [DecorationType.flower3]: "decorations/flower3.png",
   [DecorationType.flower4]: "decorations/flower4.png"
};

export const DecorationComponentArray = new ServerComponentArray<DecorationComponent, DecorationComponentData, IntermediateInfo>(ServerComponentType.decoration, true, createComponent, getMaxRenderParts, decodeData);
DecorationComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(reader: PacketReader): DecorationComponentData {
   const decorationType = reader.readNumber();

   return {
      decorationType: decorationType
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const decorationComponentData = entityComponentData.serverComponentData[ServerComponentType.decoration]!;
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(DECORATION_RENDER_INFO[decorationComponentData.decorationType])
      )
   );

   return {};
}

function createComponent(entityComponentData: EntityComponentData): DecorationComponent {
   return {
      decorationType: entityComponentData.serverComponentData[ServerComponentType.decoration]!.decorationType
   };
}

function getMaxRenderParts(): number {
   return 1;
}