import { CircularBox } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { randAngle, _point, randItem } from "../../../../../shared/src/utils";
import { createRockSpeckParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { Light } from "../../lights";
import { playSoundOnHitbox, ROCK_HIT_SOUNDS } from "../../sound";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { setRenderPartShakeAmount } from "../../render-parts/render-part-shake-amounts";
import { registerServerComponentArray } from "../component-registry";
import { Bytes } from "../../../../../shared/src/constants";
import { TextureIndex } from "../../../texture-index";

enum GolemRockSize {
   massive,
   small,
   medium,
   large,
   tiny
}

export interface GolemComponentData {
   readonly wakeProgress: number;
   readonly ticksAwake: number;
   readonly isAwake: boolean;
}

interface IntermediateInfo {
   readonly rockRenderParts: VisualRenderPart[];
   readonly eyeRenderParts: VisualRenderPart[];
   readonly eyeLights: Light[];
}

export interface GolemComponent {
   wakeProgress: number;
   
   rockRenderParts: VisualRenderPart[];
   readonly eyeRenderParts: VisualRenderPart[];
   readonly eyeLights: Light[];
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.golem, typeof GolemComponentArray> {}
}

const ANGRY_SOUND_INTERVAL_TICKS = Settings.TICK_RATE * 3;

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

const getTextureIndex = (size: GolemRockSize): TextureIndex => {
   switch (size) {
      case GolemRockSize.massive: {
         return TextureIndex.entities_golem_golemBodyMassive;
      }
      case GolemRockSize.large: {
         return TextureIndex.entities_golem_golemBodyLarge;
      }
      case GolemRockSize.medium: {
         return TextureIndex.entities_golem_golemBodyMedium;
      }
      case GolemRockSize.small: {
         return TextureIndex.entities_golem_golemBodySmall;
      }
      case GolemRockSize.tiny: {
         return TextureIndex.entities_golem_golemBodyTiny;
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

export const GolemComponentArray = registerServerComponentArray(
   ServerComponentType.golem,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
GolemComponentArray.populateIntermediateInfo = populateIntermediateInfo;
GolemComponentArray.updateFromData = updateFromData;
GolemComponentArray.onTick = onTick;
GolemComponentArray.onHit = onHit;

function decodeData(reader: PacketReader): GolemComponentData {
   const wakeProgress = reader.readNumber();

   const ticksAwake = reader.readNumber();
   reader.padOffset(2 * Bytes.Float32);

   const isAwake = reader.readBool();

   return {
      wakeProgress: wakeProgress,
      ticksAwake: ticksAwake,
      isAwake: isAwake
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   
   const rockRenderParts: VisualRenderPart[] = [];
   const eyeRenderParts: VisualRenderPart[] = [];
   const eyeLights: Light[] = [];
   
   // Add new rocks
   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];

      const box = hitbox.box as CircularBox;
      const size = getHitboxSize(box);

      const renderPart = new TexturedRenderPart(
         hitbox,
         getZIndex(size),
         randAngle(),
         0, 0,
         getTextureIndex(size)
      );
      renderObject.attachRenderPart(renderPart);
      rockRenderParts.push(renderPart);

      if (size === GolemRockSize.large) {
         for (let i = 0; i < 2; i++) {
            const eyeRenderPart = new TexturedRenderPart(
               renderPart,
               6,
               0,
               20 * (i === 0 ? -1 : 1), 17,
               TextureIndex.entities_golem_eye
            );
            eyeRenderPart.opacity = 0;
            eyeRenderPart.inheritParentRotation = false;
            renderObject.attachRenderPart(eyeRenderPart);
            eyeRenderParts.push(eyeRenderPart);
         }
      }
   }

   return {
      rockRenderParts: rockRenderParts,
      eyeRenderParts: eyeRenderParts,
      eyeLights: eyeLights
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): GolemComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const golemComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.golem);
   return {
      wakeProgress: golemComponentData.wakeProgress,
      rockRenderParts: intermediateInfo.rockRenderParts,
      eyeRenderParts: intermediateInfo.eyeRenderParts,
      eyeLights: intermediateInfo.eyeLights
   };
}

function getMaxRenderParts(entityComponentData: EntityComponentData): number {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   
   let maxRenderParts = 0;
   for (const hitbox of transformComponentData.hitboxes) {
      
      maxRenderParts++;

      const size = getHitboxSize(hitbox.box as CircularBox);
      if (size === GolemRockSize.large) {
         maxRenderParts += 2;
      }
   }
   
   return maxRenderParts;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const golemComponent = GolemComponentArray.getComponent(entity);

   if (golemComponent.wakeProgress > 0 && golemComponent.wakeProgress < 1) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         
         const box = hitbox.box as CircularBox;
         getHitboxVelocity(hitbox);
         const velocity = _point;

         const offsetDirection = randAngle();
         const x = box.posX + box.radius * Math.sin(offsetDirection);
         const y = box.posY + box.radius * Math.cos(offsetDirection);
         createRockSpeckParticle(x, y, 0, velocity.x, velocity.y, ParticleRenderLayer.low);
      }
   } else if (golemComponent.wakeProgress === 1) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         if (Math.random() >= 6 * Settings.DT_S) {
            continue;
         }

         const hitbox = transformComponent.hitboxes[i];
         const box = hitbox.box as CircularBox;
         getHitboxVelocity(hitbox);
         const velocity = _point;

         const offsetDirection = randAngle();
         const x = box.posX + box.radius * Math.sin(offsetDirection);
         const y = box.posY + box.radius * Math.cos(offsetDirection);
         createRockSpeckParticle(x, y, 0, velocity.x, velocity.y, ParticleRenderLayer.low);
      }
   }
}
   
function updateFromData(data: GolemComponentData, entity: Entity): void {
   const golemComponent = GolemComponentArray.getComponent(entity);
   
   const wakeProgress = data.wakeProgress;
   const ticksAwake = data.ticksAwake;
   const isAwake = data.isAwake;

   const transformComponent = TransformComponentArray.getComponent(entity);
   
   if (isAwake && ticksAwake % ANGRY_SOUND_INTERVAL_TICKS === 0) {
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("golem-angry.mp3", 0.4, 1, entity, hitbox, true);
   }
   
   golemComponent.wakeProgress = wakeProgress;

   // @CLEANUP
   const shakeAmount = golemComponent.wakeProgress > 0 && golemComponent.wakeProgress < 1 ? 1 : 0;
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      // const hitbox = transformComponent.hitboxes[i];
      
      // const box = hitbox.box;
      const renderPart = golemComponent.rockRenderParts[i];

      // renderPart.offset.x = box.offset.x;
      // renderPart.offset.y = box.offset.y;
      setRenderPartShakeAmount(renderPart, shakeAmount);
   }

   for (let i = 0; i < 2; i++) {
      golemComponent.eyeRenderParts[i].opacity = golemComponent.wakeProgress;
      golemComponent.eyeLights[i].intensity = golemComponent.wakeProgress;
   }
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox(randItem(ROCK_HIT_SOUNDS), 0.3, 1, entity, hitbox, false);
}