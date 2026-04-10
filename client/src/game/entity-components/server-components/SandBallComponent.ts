import { randAngle, randFloat, Settings, PacketReader, Entity, ServerComponentType, CircularBox, _point } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createSandParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface SandBallComponentData {
   readonly size: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface SandBallComponent {
   size: number;
   readonly renderPart: TexturedRenderPart;
}

export const SandBallComponentArray = new ServerComponentArray<SandBallComponent, SandBallComponentData, IntermediateInfo>(ServerComponentType.sandBall, true, createComponent, getMaxRenderParts, decodeData);
SandBallComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SandBallComponentArray.updateFromData = updateFromData;
SandBallComponentArray.onTick = onTick;

export function createSandBallComponentData(size: number): SandBallComponentData {
   return {
      size: size
   };
}

function decodeData(reader: PacketReader): SandBallComponentData {
   const size = reader.readNumber();
   
   return createSandBallComponentData(size);
}

const getTextureSource = (size: number): string => {
   return "entities/sand-ball/size-" + size + ".png";
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const sandBallComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.sandBall);
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureArrayIndex(getTextureSource(sandBallComponentData.size))
   );
   renderObject.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): SandBallComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const sandBallComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.sandBall);

   return {
      size: sandBallComponentData.size,
      renderPart: intermediateInfo.renderPart,
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(sandBall: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(sandBall);
   const hitbox = transformComponent.hitboxes[0];
   if (hitbox.rootEntity !== sandBall) {
      const hitboxRadius = (hitbox.box as CircularBox).radius;
      getHitboxVelocity(hitbox);
      const hitboxVelocity = _point;

      let particleChance = hitboxRadius * Settings.DT_S * 0.8;
      while (Math.random() < particleChance--) {
         const offsetDirection = randAngle();
         const offsetAmount = hitboxRadius * randFloat(0.7, 1);
         const x = hitbox.box.position.x + offsetAmount * Math.sin(offsetDirection);
         const y = hitbox.box.position.y + offsetAmount * Math.sin(offsetDirection);
         createSandParticle(x, y, hitboxVelocity.x, hitboxVelocity.y, offsetDirection + randFloat(-0.3, 0.3));
      }
   }
}

function updateFromData(data: SandBallComponentData, entity: Entity): void {
   const sandBallComponent = SandBallComponentArray.getComponent(entity);

   const size = data.size;
   if (size !== sandBallComponent.size) {
      sandBallComponent.renderPart.switchTextureSource(getTextureSource(size));
      sandBallComponent.size = size;
   }
}