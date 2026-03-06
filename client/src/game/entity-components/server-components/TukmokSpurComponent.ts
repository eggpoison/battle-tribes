import { randFloat, Entity, ServerComponentType, HitboxFlag } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface TukmokSpurComponentData {}

interface IntermediateInfo {}

export interface TukmokSpurComponent {}

export const TukmokSpurComponentArray = new ServerComponentArray<TukmokSpurComponent, TukmokSpurComponentData, IntermediateInfo>(ServerComponentType.tukmokSpur, true, createComponent, getMaxRenderParts, decodeData);
TukmokSpurComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TukmokSpurComponentArray.onHit = onHit;

function decodeData(): TukmokSpurComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   let textureSource: string;
   if (hitbox.flags.includes(HitboxFlag.TUKMOK_SPUR_HEAD)) {
      textureSource = "entities/tukmok-spur/spur-head.png";
   } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_SPUR_SHOULDER_LEFT_FRONT)) {
      textureSource = "entities/tukmok-spur/spur-shoulder-left-front.png";
   } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_SPUR_SHOULDER_LEFT_BACK)) {
      textureSource = "entities/tukmok-spur/spur-shoulder-left-back.png";
   } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_SPUR_SHOULDER_RIGHT_FRONT)) {
      textureSource = "entities/tukmok-spur/spur-shoulder-right-front.png";
   } else {
      textureSource = "entities/tukmok-spur/spur-shoulder-right-back.png";
   }
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(textureSource)
      )
   );

   return {};
}

function createComponent(): TukmokSpurComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("tukmok-bone-hit.mp3", 0.4, randFloat(0.92, 1.08), entity, hitbox, false);
}