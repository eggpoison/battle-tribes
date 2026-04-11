import { randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";

export interface DustfleaComponentData {}

interface IntermediateInfo {}

export interface DustfleaComponent {}

export const DustfleaComponentArray = new ServerComponentArray<DustfleaComponent, DustfleaComponentData, IntermediateInfo>(ServerComponentType.dustflea, true, createComponent, getMaxRenderParts, decodeData);
DustfleaComponentArray.populateIntermediateInfo = populateIntermediateInfo;
DustfleaComponentArray.onHit = onHit;
DustfleaComponentArray.onDie = onDie;

function decodeData(): DustfleaComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/dustflea/dustflea.png")
      )
   );

   return {};
}

function createComponent(): DustfleaComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function onHit(dustflea: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("dustflea-hit.mp3", 0.4, randFloat(0.9, 1.1), dustflea, hitbox, false);
}

function onDie(dustflea: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(dustflea);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("dustflea-explosion.mp3", 0.4, randFloat(0.9, 1.1), dustflea, hitbox, false);
}