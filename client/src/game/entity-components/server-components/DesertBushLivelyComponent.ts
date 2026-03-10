import { randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";

export interface DesertBushLivelyComponentData {}

interface IntermediateInfo {}

export interface DesertBushLivelyComponent {}

export const DesertBushLivelyComponentArray = new ServerComponentArray<DesertBushLivelyComponent, DesertBushLivelyComponentData, IntermediateInfo>(ServerComponentType.desertBushLively, true, createComponent, getMaxRenderParts, decodeData);
DesertBushLivelyComponentArray.populateIntermediateInfo = populateIntermediateInfo;
DesertBushLivelyComponentArray.onHit = onHit;
DesertBushLivelyComponentArray.onDie = onDie;

function decodeData(): DesertBushLivelyComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/desert-bush-lively/desert-bush-lively.png")
   );
   renderPart.tintR = randFloat(-0.03, 0.03);
   renderPart.tintG = randFloat(-0.03, 0.03);
   renderPart.tintB = randFloat(-0.03, 0.03);
   renderInfo.attachRenderPart(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(): DesertBushLivelyComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
}