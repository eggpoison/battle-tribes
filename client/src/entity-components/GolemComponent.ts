import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import ServerComponent from "./ServerComponent";
import { createRockSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { Light, addLight, attachLightToRenderPart } from "../lights";
import { playSound } from "../sound";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRenderInfo } from "../world";
import { EntityID } from "../../../shared/src/entities";
import { PhysicsComponentArray } from "./PhysicsComponent";

const ANGRY_SOUND_INTERVAL_TICKS = Settings.TPS * 3;

enum GolemRockSize {
   massive,
   small,
   medium,
   large,
   tiny
}

const getHitboxSize = (hitboxBox: CircularBox): GolemRockSize => {
   if (Math.abs(hitboxBox.radius - 36) < 0.01) {
      return GolemRockSize.massive;
   }
   if (Math.abs(hitboxBox.radius - 32) < 0.01) {
      return GolemRockSize.large;
   }
   if (Math.abs(hitboxBox.radius - 26) < 0.01) {
      return GolemRockSize.medium;
   }
   if (Math.abs(hitboxBox.radius - 12) < 0.01) {
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

   public wakeProgress = 0;

   public onLoad(): void {
      const transformComponent = TransformComponentArray.getComponent(this.entity.id);

      const renderInfo = getEntityRenderInfo(this.entity.id);
      
      // Add new rocks
      for (let i = this.rockRenderParts.length; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         const box = hitbox.box as CircularBox;
         
         const size = getHitboxSize(box);
   
         const renderPart = new TexturedRenderPart(
            null,
            getZIndex(size),
            2 * Math.PI * Math.random(),
            getTextureArrayIndex(getTextureSource(size))
         );
         renderPart.offset.x = box.offset.x;
         renderPart.offset.y = box.offset.y;
         renderInfo.attachRenderThing(renderPart);
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
               renderInfo.attachRenderThing(eyeRenderPart);
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
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader, isInitialData: boolean): void {
      const wakeProgress = reader.readNumber();
      const ticksAwake = reader.readNumber();
      const isAwake = reader.readBoolean();
      reader.padOffset(3);

      if (!isInitialData) {
         const transformComponent = TransformComponentArray.getComponent(this.entity.id);
   
         if (isAwake && ticksAwake % ANGRY_SOUND_INTERVAL_TICKS === 0) {
            playSound("golem-angry.mp3", 0.4, 1, transformComponent.position);
         }
         
         this.wakeProgress = wakeProgress;
   
   
         const shakeAmount = this.wakeProgress > 0 && this.wakeProgress < 1 ? 1 : 0;
         for (let i = 0; i < transformComponent.hitboxes.length; i++) {
            const hitbox = transformComponent.hitboxes[i];
            const box = hitbox.box;
            const renderPart = this.rockRenderParts[i];
   
            renderPart.offset.x = box.offset.x;
            renderPart.offset.y = box.offset.y;
            renderPart.shakeAmount = shakeAmount;
         }
   
         for (let i = 0; i < 2; i++) {
            this.eyeRenderParts[i].opacity = this.wakeProgress;
            this.eyeLights[i].intensity = this.wakeProgress;
         }
      }
   }
}

export default GolemComponent;

export const GolemComponentArray = new ComponentArray<GolemComponent>(ComponentArrayType.server, ServerComponentType.golem, true, {
   onTick: onTick
});

function onTick(golemComponent: GolemComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   if (golemComponent.wakeProgress > 0 && golemComponent.wakeProgress < 1) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         const box = hitbox.box as CircularBox;

         const offsetDirection = 2 * Math.PI * Math.random();
         const x = box.position.x + box.radius * Math.sin(offsetDirection);
         const y = box.position.y + box.radius * Math.cos(offsetDirection);
         createRockSpeckParticle(x, y, 0, physicsComponent.selfVelocity.x, physicsComponent.selfVelocity.y, ParticleRenderLayer.low);
      }
   } else if (golemComponent.wakeProgress === 1) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         if (Math.random() >= 6 / Settings.TPS) {
            continue;
         }

         const hitbox = transformComponent.hitboxes[i];
         const box = hitbox.box as CircularBox;

         const offsetDirection = 2 * Math.PI * Math.random();
         const x = box.position.x + box.radius * Math.sin(offsetDirection);
         const y = box.position.y + box.radius * Math.cos(offsetDirection);
         createRockSpeckParticle(x, y, 0, physicsComponent.selfVelocity.x, physicsComponent.selfVelocity.y, ParticleRenderLayer.low);
      }
   }
}