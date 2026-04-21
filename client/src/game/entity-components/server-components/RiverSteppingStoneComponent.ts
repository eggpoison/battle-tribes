import { randFloat, ServerComponentType, HitboxFlag } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface RiverSteppingStoneComponentData {}

export interface RiverSteppingStoneComponent {}

class _RiverSteppingStoneComponentArray extends ServerComponentArray<RiverSteppingStoneComponent, RiverSteppingStoneComponentData> {
   public decodeData(): RiverSteppingStoneComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      let textureSource: string;
      if (hitbox.flags.includes(HitboxFlag.RIVER_STEPPING_STONE_SMALL)) {
         textureSource = "entities/river-stepping-stone/stone-small.png";
      } else if (hitbox.flags.includes(HitboxFlag.RIVER_STEPPING_STONE_MEDIUM)) {
         textureSource = "entities/river-stepping-stone/stone-medium.png";
      } else {
         textureSource = "entities/river-stepping-stone/stone-large.png";
      }
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex(textureSource)
      );
      renderPart.tintR = randFloat(-0.03, 0.03);
      renderPart.tintG = randFloat(-0.03, 0.03);
      renderPart.tintB = randFloat(-0.03, 0.03);
      renderObject.attachRenderPart(renderPart)
   }

   public createComponent(): RiverSteppingStoneComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const RiverSteppingStoneComponentArray = registerServerComponentArray(ServerComponentType.riverSteppingStone, _RiverSteppingStoneComponentArray, true);