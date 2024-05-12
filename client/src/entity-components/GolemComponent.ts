import { GolemComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import { createRockSpeckParticle } from "../particles";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { ParticleRenderLayer } from "../rendering/particle-rendering";
import { Light, addLight, attachLightToRenderPart } from "../lights";

enum GolemRockSize {
   massive,
   small,
   medium,
   large,
   tiny
}

const getHitboxSize = (hitbox: CircularHitbox): GolemRockSize => {
   if (Math.abs(hitbox.radius - 36) < 0.01) {
      return GolemRockSize.massive;
   }
   if (Math.abs(hitbox.radius - 32) < 0.01) {
      return GolemRockSize.large;
   }
   if (Math.abs(hitbox.radius - 26) < 0.01) {
      return GolemRockSize.medium;
   }
   if (Math.abs(hitbox.radius - 12) < 0.01) {
      return GolemRockSize.tiny;
   }
   return GolemRockSize.small;
}

const getTextureSource = (size: GolemRockSize): string => {
   switch (size) {
      case GolemRockSize.massive: {
         return "entities/golem/golem-body-massive.png";
      }
      case GolemRockSize.large: {
         return "entities/golem/golem-body-large.png";
      }
      case GolemRockSize.medium: {
         return "entities/golem/golem-body-medium.png";
      }
      case GolemRockSize.small: {
         return "entities/golem/golem-body-small.png";
      }
      case GolemRockSize.tiny: {
         return "entities/golem/golem-body-tiny.png";
      }
   }
}

const getZIndex = (size: GolemRockSize): number => {
   switch (size) {
      case GolemRockSize.massive: {
         return 5.5;
      }
      case GolemRockSize.large: {
         return 0.1;
      }
      case GolemRockSize.medium:
      case GolemRockSize.small: {
         return Math.random() * 4.5 + 0.5;
      }
      case GolemRockSize.tiny: {
         return 0;
      }
   }
}

class GolemComponent extends ServerComponent<ServerComponentType.golem> {
   private rockRenderParts = new Array<RenderPart>();
   private readonly eyeRenderParts = new Array<RenderPart>();
   private readonly eyeLights = new Array<Light>();

   private wakeProgress: number;
   
   constructor(entity: Entity, data: GolemComponentData) {
      super(entity);

      this.wakeProgress = data.wakeProgress;
   }

   public tick(): void {
      if (this.wakeProgress > 0 && this.wakeProgress < 1) {
         for (let i = 0; i < this.entity.hitboxes.length; i++) {
            const hitbox = this.entity.hitboxes[i] as CircularHitbox;

            const offsetDirection = 2 * Math.PI * Math.random();
            const x = hitbox.position.x + hitbox.radius * Math.sin(offsetDirection);
            const y = hitbox.position.y + hitbox.radius * Math.cos(offsetDirection);
            createRockSpeckParticle(x, y, 0, this.entity.velocity.x, this.entity.velocity.y, ParticleRenderLayer.low);
         }
      } else if (this.wakeProgress === 1) {
         for (let i = 0; i < this.entity.hitboxes.length; i++) {
            if (Math.random() >= 6 / Settings.TPS) {
               continue;
            }

            const hitbox = this.entity.hitboxes[i] as CircularHitbox;

            const offsetDirection = 2 * Math.PI * Math.random();
            const x = hitbox.position.x + hitbox.radius * Math.sin(offsetDirection);
            const y = hitbox.position.y + hitbox.radius * Math.cos(offsetDirection);
            createRockSpeckParticle(x, y, 0, this.entity.velocity.x, this.entity.velocity.y, ParticleRenderLayer.low);
         }
      }
   }
   
   public updateFromData(data: GolemComponentData): void {
      this.wakeProgress = data.wakeProgress;

      // Add new rocks
      for (let i = this.rockRenderParts.length; i < this.entity.hitboxes.length; i++) {
         const hitbox = this.entity.hitboxes[i] as CircularHitbox;
         const size = getHitboxSize(hitbox);
   
         const renderPart = new RenderPart(
            this.entity,
            getTextureArrayIndex(getTextureSource(size)),
            getZIndex(size),
            2 * Math.PI * Math.random()
         );
         renderPart.offset.x = hitbox.offset.x;
         renderPart.offset.y = hitbox.offset.y;
         this.entity.attachRenderPart(renderPart);
         this.rockRenderParts.push(renderPart);
   
         if (size === GolemRockSize.large) {
            for (let i = 0; i < 2; i++) {
               const eyeRenderPart = new RenderPart(
                  renderPart,
                  getTextureArrayIndex("entities/golem/eye.png"),
                  6,
                  0
               );
               eyeRenderPart.opacity = 0;
               eyeRenderPart.offset.x = 20 * (i === 0 ? -1 : 1);
               eyeRenderPart.offset.y = 17;
               eyeRenderPart.inheritParentRotation = false;
               this.entity.attachRenderPart(eyeRenderPart);
               this.eyeRenderParts.push(eyeRenderPart);
   
               // Create eye light
               const light: Light = {
                  position: new Point(0, 0),
                  intensity: 0,
                  strength: 0.5,
                  radius: 0.15,
                  r: 0.75,
                  g: 0,
                  b: 0
               };
               this.eyeLights.push(light);
               const lightID = addLight(light);
               attachLightToRenderPart(lightID, eyeRenderPart.id);
            }
         }
      }

      const shakeAmount = this.wakeProgress > 0 && this.wakeProgress < 1 ? 1 : 0;
      for (let i = 0; i < this.entity.hitboxes.length; i++) {
         const hitbox = this.entity.hitboxes[i];
         const renderPart = this.rockRenderParts[i];

         renderPart.offset.x = hitbox.offset.x;
         renderPart.offset.y = hitbox.offset.y;
         renderPart.shakeAmount = shakeAmount;
      }

      for (let i = 0; i < 2; i++) {
         this.eyeRenderParts[i].opacity = this.wakeProgress;
         this.eyeLights[i].intensity = this.wakeProgress;
      }
   }
}

export default GolemComponent;