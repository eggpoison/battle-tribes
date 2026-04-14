import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";

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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   // Base
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/sling-turret/sling-turret-base.png")
      )
   );

   // Plate
   const plateRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      0, 0,
      getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png")
   );
   addRenderPartTag(plateRenderPart, "turretComponent:pivoting");
   renderObject.attachRenderPart(plateRenderPart);

   // Sling
   const slingRenderPart = new TexturedRenderPart(
      plateRenderPart,
      2,
      0,
      0, 0,
      getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png")
   );
   addRenderPartTag(slingRenderPart, "turretComponent:aiming");
   renderObject.attachRenderPart(slingRenderPart);

   return {};
}

function createComponent(): SlingTurretComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}