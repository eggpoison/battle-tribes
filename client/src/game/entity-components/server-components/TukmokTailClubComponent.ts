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
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tukmokTailClub, _TukmokTailClubComponentArray> {}
}

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
            TextureIndex.entities_tukmokTailClub_clubSegment
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