import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { getHitboxTag } from "../../hitboxes";
import { TextureIndex } from "../../../texture-index";

export interface TukmokTrunkComponentData {}

export interface TukmokTrunkComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tukmokTrunk, _TukmokTrunkComponentArray> {}
}

class _TukmokTrunkComponentArray extends ServerComponentArray<TukmokTrunkComponent, TukmokTrunkComponentData> {
   public decodeData(): TukmokTrunkComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

      for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
         const hitbox = transformComponentData.hitboxes[i];

         renderObject.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               0, 0,
               getHitboxTag(hitbox) === HitboxTag.tukmokTrunkHead ? TextureIndex.entities_tukmokTrunk_headSegment : TextureIndex.entities_tukmokTrunk_middleSegment
            )
         );
      }
   }

   public createComponent(): TukmokTrunkComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      // @HACK cuz we can't access the num segments constant defined in the server
      return 8;
   }
}

export const TukmokTrunkComponentArray = registerServerComponentArray(ServerComponentType.tukmokTrunk, _TukmokTrunkComponentArray, true);