import { ServerComponentType, HitboxFlag } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface TukmokTrunkComponentData {}

export interface TukmokTrunkComponent {}

class _TukmokTrunkComponentArray extends ServerComponentArray<TukmokTrunkComponent, TukmokTrunkComponentData> {
   public decodeData(): TukmokTrunkComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

      for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
         const hitbox = transformComponentData.hitboxes[i];

         const textureSource = hitbox.flags.includes(HitboxFlag.TUKMOK_TRUNK_HEAD) ? "entities/tukmok-trunk/head-segment.png" : "entities/tukmok-trunk/middle-segment.png";
         
         renderObject.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               0, 0,
               getTextureArrayIndex(textureSource)
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