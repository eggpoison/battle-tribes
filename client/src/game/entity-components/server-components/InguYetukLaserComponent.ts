import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { Entity } from "../../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { randFloat } from "../../../../../shared/src/utils";

export interface InguYetukLaserComponentData {}

interface IntermediateInfo {}

export interface InguYetukLaserComponent {}

export const InguYetukLaserComponentArray = new ServerComponentArray<InguYetukLaserComponent, InguYetukLaserComponentData, IntermediateInfo>(ServerComponentType.inguYetukLaser, true, createComponent, getMaxRenderParts, decodeData);
InguYetukLaserComponentArray.populateIntermediateInfo = populateIntermediateInfo;
InguYetukLaserComponentArray.onSpawn = onSpawn;

export function createInguYetukLaserComponentData(): InguYetukLaserComponentData {
   return {};
}

function decodeData(): InguYetukLaserComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/ingu-yetuk-laser/laser.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): InguYetukLaserComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 50;
}

function onSpawn(laser: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(laser);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("lazur.mp3", 0.4, randFloat(0.8, 1.2), laser, hitbox, false);
}