import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface TukmokTailClubComponentData {}

export interface TukmokTailClubComponent {}

class _TukmokTailClubComponentArray extends ServerComponentArray<TukmokTailClubComponent, TukmokTailClubComponentData> {
   public decodeData(): TukmokTailClubComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/tukmok-tail-club/club-segment.png")
         )
      );
   }

   public createComponent(): TukmokTailClubComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const TukmokTailClubComponentArray = registerServerComponentArray(ServerComponentType.tukmokTailClub, _TukmokTailClubComponentArray, true);