import { GolemComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createRockSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { Light, addLight, attachLightToRenderPart } from "../lights";
import { playSound } from "../sound";
import { CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "webgl-test-shared/dist/packets";

const ANGRY_SOUND_INTERVAL_TICKS = Settings.TPS * 3;

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

class GolemComponent extends ServerComponent {
   private rockRenderParts = new Array<RenderPart>();
   private readonly eyeRenderParts = new Array<RenderPart>();
   private readonly eyeLights = new Array<Light>();

   private wakeProgress: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.wakeProgress = reader.readNumber();
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

      // @Incomplete
   }

   public tick(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      const physicsComponent = this.entity.getServerComponent(ServerComponentType.physics);

      if (this.wakeProgress > 0 && this.wakeProgress < 1) {
         for (let i = 0; i < transformComponent.hitboxes.length; i++) {
            const hitbox = transformComponent.hitboxes[i] as CircularHitbox;

            const offsetDirection = 2 * Math.PI * Math.random();
            const x = hitbox.position.x + hitbox.radius * Math.sin(offsetDirection);
            const y = hitbox.position.y + hitbox.radius * Math.cos(offsetDirection);
            createRockSpeckParticle(x, y, 0, physicsComponent.velocity.x, physicsComponent.velocity.y, ParticleRenderLayer.low);
         }
      } else if (this.wakeProgress === 1) {
         for (let i = 0; i < transformComponent.hitboxes.length; i++) {
            if (Math.random() >= 6 / Settings.TPS) {
               continue;
            }

            const hitbox = transformComponent.hitboxes[i] as CircularHitbox;

            const offsetDirection = 2 * Math.PI * Math.random();
            const x = hitbox.position.x + hitbox.radius * Math.sin(offsetDirection);
            const y = hitbox.position.y + hitbox.radius * Math.cos(offsetDirection);
            createRockSpeckParticle(x, y, 0, physicsComponent.velocity.x, physicsComponent.velocity.y, ParticleRenderLayer.low);
         }
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      const wakeProgress = reader.readNumber();
      const ticksAwake = reader.readNumber();
      const isAwake = reader.readBoolean();
      reader.padOffset(3);

      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);

      if (isAwake && ticksAwake % ANGRY_SOUND_INTERVAL_TICKS === 0) {
         playSound("golem-angry.mp3", 0.4, 1, transformComponent.position);
      }
      
      this.wakeProgress = wakeProgress;

      // Add new rocks
      for (let i = this.rockRenderParts.length; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i] as CircularHitbox;
         const size = getHitboxSize(hitbox);
   
         const renderPart = new TexturedRenderPart(
            this.entity,
            getZIndex(size),
            2 * Math.PI * Math.random(),
            getTextureArrayIndex(getTextureSource(size))
         );
         renderPart.offset.x = hitbox.offset.x;
         renderPart.offset.y = hitbox.offset.y;
         this.entity.attachRenderPart(renderPart);
         this.rockRenderParts.push(renderPart);
   
         if (size === GolemRockSize.large) {
            for (let i = 0; i < 2; i++) {
               const eyeRenderPart = new TexturedRenderPart(
                  renderPart,
                  6,
                  0,
                  getTextureArrayIndex("entities/golem/eye.png")
               );
               eyeRenderPart.opacity = 0;
               eyeRenderPart.offset.x = 20 * (i === 0 ? -1 : 1);
               eyeRenderPart.offset.y = 17;
               eyeRenderPart.inheritParentRotation = false;
               this.entity.attachRenderPart(eyeRenderPart);
               this.eyeRenderParts.push(eyeRenderPart);
   
               // Create eye light
               const light: Light = {
                  offset: new Point(0, 0),
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
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
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