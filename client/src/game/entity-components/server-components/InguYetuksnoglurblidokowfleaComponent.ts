import { randFloat, randInt, Settings, Entity, ServerComponentType, HitboxTag } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData, getCurrentLayer } from "../../world";
import { playSound } from "../../sound";
import { cameraPosition } from "../../camera";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { getHitboxTag } from "../../hitboxes";

export interface InguYetuksnoglurblidokowfleaComponentData {}

export interface InguYetuksnoglurblidokowfleaComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.inguYetuksnoglurblidokowflea, _InguYetuksnoglurblidokowfleaComponentArray> {}
}

class _InguYetuksnoglurblidokowfleaComponentArray extends _ServerComponentArray<InguYetuksnoglurblidokowfleaComponent, InguYetuksnoglurblidokowfleaComponentData> {
   public decodeData(): InguYetuksnoglurblidokowfleaComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

      for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
         const hitbox = transformComponentData.hitboxes[i];
         const tag = getHitboxTag(hitbox);
         if (tag === HitboxTag.yetukBody1) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4,
               0,
               0, 0,
               getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-1.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetukBody2) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               3,
               0,
               0, 0,
               getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-2.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetukBody3) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               2,
               0,
               0, 0,
               getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-3.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetukBody4) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               1,
               0,
               0, 0,
               getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/body-4.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetukSnobeTail) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               1.1,
               0,
               0, 0,
               getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/snobe-tail.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetukGlurbSegment) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               0,
               0,
               0, 0,
               getTextureArrayIndex("entities/glurb/glurb-middle-segment.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetiHead) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               5,
               0,
               0, 0,
               getTextureArrayIndex("entities/yeti/yeti-head.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetukMandibleBig) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.8,
               0,
               0, 0,
               getTextureArrayIndex("entities/okren/adult/mandible.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetukMandibleMedium) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.7,
               0,
               0, 0,
               getTextureArrayIndex("entities/okren/juvenile/mandible.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.yetukDustfleaDispensionPort) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.1,
               0,
               0, 0,
               getTextureArrayIndex("entities/ingu-yetuksnoglurblidokowflea/dustflea-dispension-port.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (tag === HitboxTag.tukmokTailMiddleSegmentSmall) {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  i * 0.02,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/tukmok/tail-segment-small.png")
               )
            );
         } else if (tag === HitboxTag.tukmokTailMiddleSegmentMedium) {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  i * 0.02,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/tukmok/tail-segment-medium.png")
               )
            );
         } else {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  i * 0.02,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/tukmok/tail-segment-big.png")
               )
            );
         }
      }
   }

   public onTick(inguYetuk: Entity): void {
      // @HACK!!!


      const mult = 1.5;

      if (Math.random() < 0.6 * mult * Settings.DT_S) {
         playSound("cow-ambient-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 0.4 * mult * Settings.DT_S) {
         playSound("cow-hurt-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 0.3 * mult * Settings.DT_S) {
         playSound("cow-die-1.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }

      if (Math.random() < 0.6 * mult * Settings.DT_S) {
         playSound("yeti-ambient-" + randInt(1, 6) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 0.6 * mult * Settings.DT_S) {
         playSound("yeti-angry-" + randInt(1, 5) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 0.5 * mult * Settings.DT_S) {
         playSound("yeti-hurt-" + randInt(1, 5) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 0.3 * mult * Settings.DT_S) {
         playSound("yeti-death-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }

      if (Math.random() < 2 * mult * Settings.DT_S) {
         playSound("glurb-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1 * mult * Settings.DT_S) {
         playSound("glurb-death.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }

      if (Math.random() < 0.8 * mult * Settings.DT_S) {
         playSound("tukmok-bone-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1.2 * mult * Settings.DT_S) {
         playSound("tukmok-hit-flesh-" + randInt(1, 4) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1.2 * mult * Settings.DT_S) {
         playSound("tukmok-angry-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 0.5 * mult * Settings.DT_S) {
         playSound("tukmok-death.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }

      if (Math.random() < 0.65 * mult * Settings.DT_S) {
         playSound("ingu-serpent-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 0.5 * mult * Settings.DT_S) {
         playSound("ingu-serpent-death.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1 * mult * Settings.DT_S) {
         playSound("ingu-serpent-angry-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1.2 * mult * Settings.DT_S) {
         playSound("ingu-serpent-leap.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }


      if (Math.random() < 1.2 * mult * Settings.DT_S) {
         playSound("snobe-hit-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1.2 * mult * Settings.DT_S) {
         playSound("snobe-death-" + randInt(1,3) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1.5 * mult * Settings.DT_S) {
         playSound("snobe-ambient-" + randInt(1,4) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }

      if (Math.random() < 1 * mult * Settings.DT_S) {
         playSound("krumblid-death.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1 * mult * Settings.DT_S) {
         playSound("krumblid-hit-flesh-" + randInt(1, 2) + ".mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
      if (Math.random() < 1 * mult * Settings.DT_S) {
         playSound("krumblid-hit-shell.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }

      if (Math.random() < 0.7 * mult * Settings.DT_S) {
         playSound("okren-eye-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }

      if (Math.random() < 1 * mult * Settings.DT_S) {
         playSound("dustflea-hit.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }

      if (Math.random() < 2.5 * mult * Settings.DT_S) {
         playSound("dustflea-egg-pop.mp3", 0.4, randFloat(0.8, 1.2), cameraPosition.x, cameraPosition.y, getCurrentLayer());
      }
   }

   public createComponent(): InguYetuksnoglurblidokowfleaComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 60;
   }
}

export const InguYetuksnoglurblidokowfleaComponentArray = registerServerComponentArray(ServerComponentType.inguYetuksnoglurblidokowflea, _InguYetuksnoglurblidokowfleaComponentArray, true);

export function createInguYetuksnoglurblidokowfleaComponentData(): InguYetuksnoglurblidokowfleaComponentData {
   return {};
}