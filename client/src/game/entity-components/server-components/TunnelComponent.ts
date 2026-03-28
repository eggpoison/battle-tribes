import { angle, lerp, PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TUNNEL_TEXTURE_SOURCES } from "./BuildingMaterialComponent";
import { TransformComponentArray } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface TunnelComponentData {
   readonly doorBitset: number;
   readonly topDoorOpenProgress: number;
   readonly bottomDoorOpenProgress: number;
}

interface IntermediateInfo {}

export interface TunnelComponent {
   doorBitset: number;
   topDoorOpenProgress: number;
   bottomDoorOpenProgress: number;
   
   readonly doorRenderParts: Record<number, VisualRenderPart>;
}

const doorHalfDiagonalLength = Math.sqrt(16 * 16 + 48 * 48) / 2;
const angleToCenter = angle(16, 48);

export interface TunnelDoorInfo {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
}

const getTunnelDoorInfo = (doorBit: number, openProgress: number): TunnelDoorInfo => {
   const isTopDoor = doorBit === 0b01;

   const baseRotation = isTopDoor ? -Math.PI/2 : Math.PI/2;
   const rotation = baseRotation + lerp(0, Math.PI/2 - 0.1, openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

   return {
      offsetX: xOffset,
      offsetY: yOffset + (isTopDoor ? 32 : -32),
      rotation: rotation + Math.PI/2
   };
}

export const TunnelComponentArray = new ServerComponentArray<TunnelComponent, TunnelComponentData, IntermediateInfo>(ServerComponentType.tunnel, true, createComponent, getMaxRenderParts, decodeData);
TunnelComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TunnelComponentArray.updateFromData = updateFromData;

export function createTunnelComponentData(): TunnelComponentData {
   return {
      doorBitset: 0,
      topDoorOpenProgress: 0,
      bottomDoorOpenProgress: 0
   };
}

function decodeData(reader: PacketReader): TunnelComponentData {
   const doorBitset = reader.readNumber();
   const topDoorOpenProgress = reader.readNumber();
   const bottomDoorOpenProgress = reader.readNumber();
   return {
      doorBitset: doorBitset,
      topDoorOpenProgress: topDoorOpenProgress,
      bottomDoorOpenProgress: bottomDoorOpenProgress
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const buildingMaterialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);

   const renderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      0, 0,
      getTextureArrayIndex(TUNNEL_TEXTURE_SOURCES[buildingMaterialComponentData.material])
   );

   renderObject.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityComponentData: EntityComponentData): TunnelComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tunnelComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tunnel);
   
   return {
      doorBitset: tunnelComponentData.doorBitset,
      topDoorOpenProgress: tunnelComponentData.topDoorOpenProgress,
      bottomDoorOpenProgress: tunnelComponentData.bottomDoorOpenProgress,
      doorRenderParts: {}
   };
}

function getMaxRenderParts(): number {
   return 1;
}

const addDoor = (tunnelComponent: TunnelComponent, entity: Entity, doorBit: number): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      doorBit === 0b10 ? Math.PI : 0,
      0, doorBit === 0b10 ? -32 : 32,
      getTextureArrayIndex("entities/tunnel/tunnel-door.png")
   );
   
   tunnelComponent.doorRenderParts[doorBit] = renderPart;

   const renderObject = getEntityRenderObject(entity);
   renderObject.attachRenderPart(renderPart);

   // @Temporary
   playSoundOnHitbox("spike-place.mp3", 0.5, 1, entity, hitbox, false);
}

const updateDoor = (tunnelComponent: TunnelComponent, doorBit: number, openProgress: number): void => {
   const doorInfo = getTunnelDoorInfo(doorBit, openProgress);

   const doorRenderPart = tunnelComponent.doorRenderParts[doorBit];
   doorRenderPart.offsetX = doorInfo.offsetX;
   doorRenderPart.offsetY = doorInfo.offsetY;
   doorRenderPart.angle = doorInfo.rotation;
}

function updateFromData(data: TunnelComponentData, entity: Entity): void {
   const tunnelComponent = TunnelComponentArray.getComponent(entity);
   
   const doorBitset = data.doorBitset;
   const topDoorOpenProgress = data.topDoorOpenProgress;
   const bottomDoorOpenProgress = data.bottomDoorOpenProgress;

   if ((doorBitset & 0b01) !== (tunnelComponent.doorBitset & 0b01)) {
      addDoor(tunnelComponent, entity, 0b01);
   }
   if ((doorBitset & 0b10) !== (tunnelComponent.doorBitset & 0b10)) {
      addDoor(tunnelComponent, entity, 0b10);
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   // Play open/close sounds
   if ((topDoorOpenProgress > 0 && tunnelComponent.topDoorOpenProgress === 0) || (bottomDoorOpenProgress > 0 && tunnelComponent.bottomDoorOpenProgress === 0)) {
      playSoundOnHitbox("door-open.mp3", 0.4, 1, entity, hitbox, false);
   }
   if ((topDoorOpenProgress < 1 && tunnelComponent.topDoorOpenProgress === 1) || (bottomDoorOpenProgress < 1 && tunnelComponent.bottomDoorOpenProgress === 1)) {
      playSoundOnHitbox("door-close.mp3", 0.4, 1, entity, hitbox, false);
   }
   
   tunnelComponent.doorBitset = doorBitset;
   tunnelComponent.topDoorOpenProgress = topDoorOpenProgress;
   tunnelComponent.bottomDoorOpenProgress = bottomDoorOpenProgress;

   // Update the doors
   if ((tunnelComponent.doorBitset & 0b01) !== 0) {
      updateDoor(tunnelComponent, 0b01, topDoorOpenProgress);
   }
   if ((tunnelComponent.doorBitset & 0b10) !== 0) {
      updateDoor(tunnelComponent, 0b10, bottomDoorOpenProgress);
   }
}