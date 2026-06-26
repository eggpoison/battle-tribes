import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { randFloat } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface InguYetukLaserComponentData {}

export interface InguYetukLaserComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.inguYetukLaser, typeof InguYetukLaserComponentArray> {}
}

export const InguYetukLaserComponentArray = registerServerComponentArray(
   ServerComponentType.inguYetukLaser,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
InguYetukLaserComponentArray.populateIntermediateInfo = populateIntermediateInfo;
InguYetukLaserComponentArray.onSpawn = onSpawn;

function decodeData(): InguYetukLaserComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      TextureIndex.entities_inguYetukLaser_laser
   );
   renderObject.attachRenderPart(renderPart);
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

export function createInguYetukLaserComponentData(): InguYetukLaserComponentData {
   return {};
}