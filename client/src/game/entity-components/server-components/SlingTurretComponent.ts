import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getTransformComponentData } from "../../entity-component-types";

export interface SlingTurretComponentData {}

interface IntermediateInfo {}

export interface SlingTurretComponent {}

export const SlingTurretComponentArray = new ServerComponentArray<SlingTurretComponent, SlingTurretComponentData, IntermediateInfo>(ServerComponentType.slingTurret, true, createComponent, getMaxRenderParts, decodeData);
SlingTurretComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createSlingTurretComponentData(): SlingTurretComponentData {
   return {};
}

function decodeData(): SlingTurretComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   // Base
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/sling-turret/sling-turret-base.png")
      )
   );

   // Plate
   const plateRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png")
   );
   plateRenderPart.addTag("turretComponent:pivoting");
   renderInfo.attachRenderPart(plateRenderPart);

   // Sling
   const slingRenderPart = new TexturedRenderPart(
      plateRenderPart,
      2,
      0,
      getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png")
   );
   slingRenderPart.addTag("turretComponent:aiming");
   renderInfo.attachRenderPart(slingRenderPart);

   return {};
}

function createComponent(): SlingTurretComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}