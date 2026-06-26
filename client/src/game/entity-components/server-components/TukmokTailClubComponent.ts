import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface TukmokTailClubComponentData {}

export interface TukmokTailClubComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tukmokTailClub, typeof TukmokTailClubComponentArray> {}
}

export const TukmokTailClubComponentArray = registerServerComponentArray(
   ServerComponentType.tukmokTailClub,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
TukmokTailClubComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): TukmokTailClubComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_tukmokTailClub_clubSegment
      )
   );
}

function createComponent(): TukmokTailClubComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}