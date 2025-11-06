import { Entity, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface BarrelComponentData {}

interface IntermediateInfo {}

export interface BarrelComponent {}

export const BarrelComponentArray = new ServerComponentArray<BarrelComponent, BarrelComponentData, IntermediateInfo>(ServerComponentType.barrel, true, createComponent, getMaxRenderParts, decodeData);
BarrelComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BarrelComponentArray.onHit = onHit;
BarrelComponentArray.onDie = onDie;

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/barrel/barrel.png")
      )
   );

   return {};
}

export function createBarrelComponentData(): BarrelComponentData {
   return {};
}

function decodeData(): BarrelComponentData {
   return {};
}

function createComponent(): BarrelComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}