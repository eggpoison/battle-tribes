import { HitboxTag, getBoxFlipX } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Point, randFloat, angle, randAngle } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { getHitboxTag, Hitbox } from "../../hitboxes";
import { createOkrenEyeParticle } from "../../particles";
import { EntityRenderObject } from "../../EntityRenderObject";
import { renderParentIsHitbox } from "../../render-parts/render-parts";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

// @Copynpaste from server
export const enum OkrenAgeStage {
   juvenile,
   youth,
   adult,
   elder,
   ancient
}

export interface OkrenComponentData {
   readonly size: OkrenAgeStage;
   readonly rightEyeHardenTimer: number;
   readonly leftEyeHardenTimer: number;
}

export interface OkrenComponent {
   size: OkrenAgeStage;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.okren, typeof OkrenComponentArray> {}
}

const getBodyTextureIndex = (size: number): TextureIndex => {
   switch (size) {
      case 0: return TextureIndex.entities_okren_juvenile_body;
      case 1: return TextureIndex.entities_okren_youth_body;
      case 2: return TextureIndex.entities_okren_adult_body;
      case 3: return TextureIndex.entities_okren_elder_body;
      case 4: return TextureIndex.entities_okren_ancient_body;
      default: throw new Error();
   }
}

export const OkrenComponentArray = registerServerComponentArray(
   ServerComponentType.okren,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
OkrenComponentArray.populateIntermediateInfo = populateIntermediateInfo;
OkrenComponentArray.updateFromData = updateFromData;
OkrenComponentArray.onHit = onHit;

const getEyeRenderPart = (okren: Entity, flipX: boolean): TexturedRenderPart => {
   const renderObject = getEntityRenderObject(okren);
   for (const renderPart of renderObject.renderPartsByZIndex) {
      if (renderParentIsHitbox(renderPart.parent) && getHitboxTag(renderPart.parent) === HitboxTag.okrenEye && getBoxFlipX(renderPart.parent.box) === flipX) {
         return renderPart as TexturedRenderPart;
      }
   }
   throw new Error();
}

function decodeData(reader: PacketReader): OkrenComponentData {
   const size = reader.readNumber();
   const rightEyeHardenTimer = reader.readNumber();
   const leftEyeHardenTimer = reader.readNumber();

   return {
      size: size,
      rightEyeHardenTimer: rightEyeHardenTimer,
      leftEyeHardenTimer: leftEyeHardenTimer
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const okrenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.okren);

   const bodyTextureIndex = getBodyTextureIndex(okrenComponentData.size);
   
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   for (const hitbox of transformComponentData.hitboxes) {
      switch (getHitboxTag(hitbox)) {
         case HitboxTag.okrenBody: {
            const bodyRenderPart = new TexturedRenderPart(
               hitbox,
               3,
               0,
               0, 0,
               bodyTextureIndex
            );
            addRenderPartTag(bodyRenderPart, "tamingComponent:head");
            renderObject.attachRenderPart(bodyRenderPart);
            break;
         }
         case HitboxTag.okrenEye: {
            const hardenTimer = getBoxFlipX(hitbox.box) ? okrenComponentData.leftEyeHardenTimer : okrenComponentData.rightEyeHardenTimer;
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  5,
                  0,
                  0, 0,
                  bodyTextureIndex + (hardenTimer > 0 ? 1 : 2)
               )
            );
            break;
         }
         case HitboxTag.okrenMandible: {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  2,
                  0,
                  0, 0,
                  bodyTextureIndex + 3
               )
            );
            break;
         }
      }
   }
}

function createComponent(entityComponentData: EntityComponentData): OkrenComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const okrenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.okren);
   return {
      size: okrenComponentData.size
   };
}

function getMaxRenderParts(): number {
   return 5;
}

function updateFromData(data: OkrenComponentData, okren: Entity): void {
   const size = data.size;

   const okrenComponent = OkrenComponentArray.getComponent(okren);
   if (okrenComponent.size !== size) {
      okrenComponent.size = size;
   }

   const rightEyeHardenTimer = data.rightEyeHardenTimer;
   const leftEyeHardenTimer = data.leftEyeHardenTimer;

   const bodyTextureIndex = getBodyTextureIndex(okrenComponent.size);

   const leftEye = getEyeRenderPart(okren, true);
   leftEye.switchTextureSource(bodyTextureIndex + (leftEyeHardenTimer > 0 ? 1 : 2));
   const rightEye = getEyeRenderPart(okren, false);
   rightEye.switchTextureSource(bodyTextureIndex + (rightEyeHardenTimer > 0 ? 1 : 2));
}

function onHit(_okren: Entity, hitbox: Hitbox, hitPosition: Point): void {
   if (getHitboxTag(hitbox) === HitboxTag.okrenEye) {
      // @INCOMPLETE: this is meant for the ancient okren size. not tweaked for anything else
      for (let i = 0; i < 10; i++) {
         const offsetMagnitude = randFloat(10, 20);
         const offsetDirection = angle(hitPosition.x - hitbox.box.posX, hitPosition.y - hitbox.box.posY) + randAngle() * 0.2;
         const particlePos = new Point(hitbox.box.posX, hitbox.box.posY).offset(offsetMagnitude, offsetDirection);
         createOkrenEyeParticle(particlePos.x, particlePos.y, 0, 0, offsetDirection);
      }
   }
}