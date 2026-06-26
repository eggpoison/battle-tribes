import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SlingTurretComponentData {}

export interface SlingTurretComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.slingTurret, typeof SlingTurretComponentArray> {}
}

export const SlingTurretComponentArray = registerServerComponentArray(
   ServerComponentType.slingTurret,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SlingTurretComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): SlingTurretComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   // Base
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_slingTurret_slingTurretBase
      )
   );

   // Plate
   const plateRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      0, 0,
      TextureIndex.entities_slingTurret_slingTurretPlate
   );
   addRenderPartTag(plateRenderPart, "turretComponent:pivoting");
   renderObject.attachRenderPart(plateRenderPart);

   // Sling
   const slingRenderPart = new TexturedRenderPart(
      plateRenderPart,
      2,
      0,
      0, 0,
      TextureIndex.entities_slingTurret_slingTurretSling
   );
   addRenderPartTag(slingRenderPart, "turretComponent:aiming");
   renderObject.attachRenderPart(slingRenderPart);
}

function createComponent(): SlingTurretComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

export function createSlingTurretComponentData(): SlingTurretComponentData {
   return {};
}