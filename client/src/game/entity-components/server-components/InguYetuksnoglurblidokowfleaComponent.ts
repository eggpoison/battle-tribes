import { randFloat, randInt, Settings, Entity, HitboxFlag, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData, getCurrentLayer } from "../../world";
import { playSound } from "../../sound";
import { cameraPosition } from "../../camera";

export interface InguYetuksnoglurblidokowfleaComponentData {}

interface IntermediateInfo {}

export interface InguYetuksnoglurblidokowfleaComponent {}

export const InguYetuksnoglurblidokowfleaComponentArray = new ServerComponentArray<InguYetuksnoglurblidokowfleaComponent, InguYetuksnoglurblidokowfleaComponentData, IntermediateInfo>(ServerComponentType.inguYetuksnoglurblidokowflea, true, createComponent, getMaxRenderParts, decodeData);
InguYetuksnoglurblidokowfleaComponentArray.populateIntermediateInfo = populateIntermediateInfo;
InguYetuksnoglurblidokowfleaComponentArray.onTick = onTick;

export function createInguYetuksnoglurblidokowfleaComponentData(): InguYetuksnoglurblidokowfleaComponentData {
   return {};
}

function decodeData(): InguYetuksnoglurblidokowfleaComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;

   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_1)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-1.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_2)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            3,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-2.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_3)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            2,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-3.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_4)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-4.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_SNOBE_TAIL)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            1.1,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/snobe-tail.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_GLURB_SEGMENT)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/glurb/glurb-middle-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETI_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            5,
            0,
            getTextureArrayIndex("entities/yeti/yeti-head.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_BIG)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.8,
            0,
            getTextureArrayIndex("entities/okren/adult/mandible.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_MEDIUM)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/okren/juvenile/mandible.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_DUSTFLEA_DISPENSION_PORT)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.1,
            0,
            getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/dustflea-dispension-port.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               getTextureArrayIndex("entities/tukmok/tail-segment-small.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               getTextureArrayIndex("entities/tukmok/tail-segment-medium.png")
            )
         );
      } else {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               getTextureArrayIndex("entities/tukmok/tail-segment-big.png")
            )
         );
      }
   }

   return {};
}

function onTick(inguYetuk: Entity): void {
   // @HACK!!!


   const mult = 1.5;

   if (Math.random() < 0.6 * mult * Settings.DT_S) {
      playSound("cow-ambient-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.4 * mult * Settings.DT_S) {
      playSound("cow-hurt-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.3 * mult * Settings.DT_S) {
      playSound("cow-die-1.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }

   if (Math.random() < 0.6 * mult * Settings.DT_S) {
      playSound("yeti-ambient-" + randInt(1, 6) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.6 * mult * Settings.DT_S) {
      playSound("yeti-angry-" + randInt(1, 5) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.5 * mult * Settings.DT_S) {
      playSound("yeti-hurt-" + randInt(1, 5) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.3 * mult * Settings.DT_S) {
      playSound("yeti-death-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }

   if (Math.random() < 2 * mult * Settings.DT_S) {
      playSound("glurb-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1 * mult * Settings.DT_S) {
      playSound("glurb-death.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }

   if (Math.random() < 0.8 * mult * Settings.DT_S) {
      playSound("tukmok-bone-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.2 * mult * Settings.DT_S) {
      playSound("tukmok-hit-flesh-" + randInt(1, 4) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.2 * mult * Settings.DT_S) {
      playSound("tukmok-angry-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.5 * mult * Settings.DT_S) {
      playSound("tukmok-death.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }

   if (Math.random() < 0.65 * mult * Settings.DT_S) {
      playSound("ingu-serpent-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 0.5 * mult * Settings.DT_S) {
      playSound("ingu-serpent-death.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1 * mult * Settings.DT_S) {
      playSound("ingu-serpent-angry-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.2 * mult * Settings.DT_S) {
      playSound("ingu-serpent-leap.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }


   if (Math.random() < 1.2 * mult * Settings.DT_S) {
      playSound("snobe-hit-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.2 * mult * Settings.DT_S) {
      playSound("snobe-death-" + randInt(1,3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1.5 * mult * Settings.DT_S) {
      playSound("snobe-ambient-" + randInt(1,4) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }

   if (Math.random() < 1 * mult * Settings.DT_S) {
      playSound("krumblid-death.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1 * mult * Settings.DT_S) {
      playSound("krumblid-hit-flesh-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
   if (Math.random() < 1 * mult * Settings.DT_S) {
      playSound("krumblid-hit-shell.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }

   if (Math.random() < 0.7 * mult * Settings.DT_S) {
      playSound("okren-eye-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }

   if (Math.random() < 1 * mult * Settings.DT_S) {
      playSound("dustflea-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }

   if (Math.random() < 2.5 * mult * Settings.DT_S) {
      playSound("dustflea-egg-pop.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.copy(), getCurrentLayer());
   }
}

function createComponent(): InguYetuksnoglurblidokowfleaComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 60;
}