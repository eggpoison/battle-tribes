import { Entity, PacketReader, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface BarrelComponentData {
   readonly isOpened: boolean;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface BarrelComponent {
   readonly renderPart: TexturedRenderPart;
}

export const BarrelComponentArray = new ServerComponentArray<BarrelComponent, BarrelComponentData, IntermediateInfo>(ServerComponentType.barrel, true, createComponent, getMaxRenderParts, decodeData);
BarrelComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BarrelComponentArray.onHit = onHit;
BarrelComponentArray.onDie = onDie;
BarrelComponentArray.updateFromData = updateFromData;

const getTextureSource = (isOpened: boolean): string => {
   return isOpened ? "entities/barrel/barrel-open.png" : "entities/barrel/barrel.png";
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const barrelComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.barrel);
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureArrayIndex(getTextureSource(barrelComponentData.isOpened))
   );
   renderObject.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

export function createBarrelComponentData(): BarrelComponentData {
   return {
      isOpened: false
   };
}

function decodeData(reader: PacketReader): BarrelComponentData {
   const isOpened = reader.readBool();
   
   return {
      isOpened: isOpened
   };
}

function createComponent(_entityComponentData: EntityComponentData, intermediateInfo: Readonly<IntermediateInfo>): BarrelComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function updateFromData(data: BarrelComponentData, entity: Entity): void {
   const barrelComponent = BarrelComponentArray.getComponent(entity);
   const textureSource = getTextureSource(data.isOpened);
   barrelComponent.renderPart.switchTextureSource(textureSource);
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}