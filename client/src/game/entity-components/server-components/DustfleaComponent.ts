import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { randFloat } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface DustfleaComponentData {}

export interface DustfleaComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.dustflea, typeof DustfleaComponentArray> {}
}

export const DustfleaComponentArray = registerServerComponentArray(
   ServerComponentType.dustflea,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
DustfleaComponentArray.populateIntermediateInfo = populateIntermediateInfo;
DustfleaComponentArray.onHit = onHit;
DustfleaComponentArray.onDie = onDie;

function decodeData(): DustfleaComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_dustflea_dustflea
      )
   );
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