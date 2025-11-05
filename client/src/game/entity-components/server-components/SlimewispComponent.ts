import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../../shared/src/entities";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";

export interface SlimewispComponentData {}

interface IntermediateInfo {}

export interface SlimewispComponent {}

export const SlimewispComponentArray = new ServerComponentArray<SlimewispComponent, SlimewispComponentData, IntermediateInfo>(ServerComponentType.slimewisp, true, createComponent, getMaxRenderParts, decodeData);
SlimewispComponentArray.updateFromData = updateFromData;
SlimewispComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SlimewispComponentArray.onHit = onHit;
SlimewispComponentArray.onDie = onDie;

function decodeData(): SlimewispComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(`entities/slimewisp/slimewisp.png`)
   );
   renderPart.opacity = 0.8;
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): SlimewispComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function updateFromData(): void {}

function onHit(_entity: Entity, hitbox: Hitbox): void {
   const radius = (hitbox.box as CircularBox).radius;
   
   createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, radius);

   for (let i = 0; i < 2; i++) {
      createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random());
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const radius = (hitbox.box as CircularBox).radius;

   createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, radius);

   for (let i = 0; i < 3; i++) {
      createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random());
   }
}