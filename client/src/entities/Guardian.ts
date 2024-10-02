import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import Entity from "../Entity";
import { addLight, attachLightToRenderPart, Light } from "../lights";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

export default class Guardian extends Entity {
   constructor(id: number) {
      super(id, EntityType.cow);
   }

   public onLoad(): void {
      const headRenderPart = new TexturedRenderPart(
         null,
         2,
         0,
         getTextureArrayIndex("entities/guardian/guardian-head.png")
      );
      headRenderPart.offset.y = 28;
      this.attachRenderThing(headRenderPart);

      const bodyRenderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/guardian/guardian-body.png")
      );
      this.attachRenderThing(bodyRenderPart);

      // Limbs
      for (let i = 0; i < 2; i++) {
         const renderPart = new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/guardian/guardian-limb.png")
         );
         renderPart.offset.x = 36 * (i === 0 ? 1 : -1);
         renderPart.offset.y = 18;
         this.attachRenderThing(renderPart);
      }

      // Red lights

      let light: Light = {
         offset: new Point(0, 4.5 * 4),
         intensity: 0.5,
         strength: 0.3,
         radius: 6,
         r: 1,
         g: 0,
         b: 0.1
      };
      let lightID = addLight(light);
      attachLightToRenderPart(lightID, headRenderPart.id);

      for (let i = 0; i < 2; i++) {
         const light: Light = {
            offset: new Point(4.25 * 4 * (i === 0 ? 1 : -1), 3.25 * 4),
            intensity: 0.4,
            strength: 0.2,
            radius: 4,
            r: 1,
            g: 0,
            b: 0.1
         };
         const lightID = addLight(light);
         attachLightToRenderPart(lightID, headRenderPart.id);
      }

      // Green lights

      light = {
         offset: new Point(0, -3 * 4),
         intensity: 0.5,
         strength: 0.3,
         radius: 6,
         r: 0,
         g: 1,
         b: 0
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      // Amethyst lights

      // @Temporary
      // light = {
      //    offset: new Point(0, 4 * 4),
      //    intensity: 0.35,
      //    strength: 0.2,
      //    radius: 4,
      //    r: 0.6,
      //    g: 0,
      //    b: 1
      // };
      // lightID = addLight(light);
      // attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(5 * 4, 6.5 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(6.5 * 4, 3 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(10 * 4, 0),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(8 * 4, -5 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(3.5 * 4, -8 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(-2 * 4, -9 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(-5 * 4, -5 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(-8 * 4, -3 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(-7 * 4, 2.5 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);

      light = {
         offset: new Point(-8 * 4, 6 * 4),
         intensity: 0.35,
         strength: 0.2,
         radius: 4,
         r: 0.6,
         g: 0,
         b: 1
      };
      lightID = addLight(light);
      attachLightToRenderPart(lightID, bodyRenderPart.id);
   }
}