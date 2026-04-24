import { Point, randAngle, randFloat, Entity, HitboxFlag, ServerComponentType, PacketReader } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { Hitbox } from "../../hitboxes";
import { createOkrenEyeParticle } from "../../particles";
import { EntityRenderObject } from "../../EntityRenderObject";
import { renderParentIsHitbox } from "../../render-parts/render-parts";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";

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
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.okren, _OkrenComponentArray> {}
}

class _OkrenComponentArray extends _ServerComponentArray<OkrenComponent, OkrenComponentData> {
   public decodeData(reader: PacketReader): OkrenComponentData {
      const size = reader.readNumber();
      const rightEyeHardenTimer = reader.readNumber();
      const leftEyeHardenTimer = reader.readNumber();

      return {
         size: size,
         rightEyeHardenTimer: rightEyeHardenTimer,
         leftEyeHardenTimer: leftEyeHardenTimer
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const okrenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.okren);
      
      let sizeString: string;
      switch (okrenComponentData.size) {
         case 0: sizeString = "juvenile"; break;
         case 1: sizeString = "youth"; break;
         case 2: sizeString = "adult"; break;
         case 3: sizeString = "elder"; break;
         case 4: sizeString = "ancient"; break;
         default: throw new Error();
      }
      
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      for (const hitbox of transformComponentData.hitboxes) {
         if (hitbox.flags.includes(HitboxFlag.OKREN_BODY)) {
            const bodyRenderPart = new TexturedRenderPart(
               hitbox,
               3,
               0,
               0, 0,
               getTextureArrayIndex("entities/okren/" + sizeString + "/body.png")
            );
            addRenderPartTag(bodyRenderPart, "tamingComponent:head");
            renderObject.attachRenderPart(bodyRenderPart);
         } else if (hitbox.flags.includes(HitboxFlag.OKREN_EYE)) {
            const hardenTimer = hitbox.box.flipX ? okrenComponentData.leftEyeHardenTimer : okrenComponentData.rightEyeHardenTimer;
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  5,
                  0,
                  0, 0,
                  getTextureArrayIndex(getEyeTextureSource(okrenComponentData.size, hardenTimer))
               )
            );
         } else if (hitbox.flags.includes(HitboxFlag.OKREN_MANDIBLE)) {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  2,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/okren/" + sizeString + "/mandible.png")
               )
            );
         }
      }
   }

   public createComponent(entityComponentData: EntityComponentData): OkrenComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const okrenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.okren);
      return {
         size: okrenComponentData.size
      };
   }

   public getMaxRenderParts(): number {
      return 5;
   }

   public updateFromData(data: OkrenComponentData, okren: Entity): void {
      const size = data.size;

      const okrenComponent = OkrenComponentArray.getComponent(okren);
      if (okrenComponent.size !== size) {
         okrenComponent.size = size;
      }

      const rightEyeHardenTimer = data.rightEyeHardenTimer;
      const leftEyeHardenTimer = data.leftEyeHardenTimer;

      const leftEye = getEyeRenderPart(okren, true);
      leftEye.switchTextureSource(getEyeTextureSource(size, leftEyeHardenTimer));
      const rightEye = getEyeRenderPart(okren, false);
      rightEye.switchTextureSource(getEyeTextureSource(size, rightEyeHardenTimer));
   }

   public onHit(_okren: Entity, hitbox: Hitbox, hitPosition: Point): void {
      if (hitbox.flags.includes(HitboxFlag.OKREN_EYE)) {
         // @INCOMPLETE: this is meant for the ancient okren size. not tweaked for anything else
         for (let i = 0; i < 10; i++) {
            const offsetMagnitude = randFloat(10, 20);
            const offsetDirection = hitbox.box.position.angleTo(hitPosition) + randAngle() * 0.2;
            const particlePos = hitbox.box.position.offset(offsetMagnitude, offsetDirection);
            createOkrenEyeParticle(particlePos.x, particlePos.y, 0, 0, offsetDirection);
         }
      }
   }
}

export const OkrenComponentArray = registerServerComponentArray(ServerComponentType.okren, _OkrenComponentArray, true);

const getEyeTextureSource = (okrenSize: number, eyeHardenTimer: number): string => {
   // @Copynpaste @Speed
   let sizeString: string;
   switch (okrenSize) {
      case 0: sizeString = "juvenile"; break;
      case 1: sizeString = "youth"; break;
      case 2: sizeString = "adult"; break;
      case 3: sizeString = "elder"; break;
      case 4: sizeString = "ancient"; break;
      default: throw new Error();
   }
   
   if (eyeHardenTimer > 0) {
      return "entities/okren/" + sizeString + "/eye-crust.png";
   } else {
      return "entities/okren/" + sizeString + "/eye.png";
   }
}
   
const getEyeRenderPart = (okren: Entity, flipX: boolean): TexturedRenderPart => {
   const renderObject = getEntityRenderObject(okren);
   for (const renderPart of renderObject.renderPartsByZIndex) {
      if (renderParentIsHitbox(renderPart.parent) && renderPart.parent.flags.includes(HitboxFlag.OKREN_EYE) && renderPart.parent.box.flipX === flipX) {
         return renderPart as TexturedRenderPart;
      }
   }
   throw new Error();
}