import { CircularBox } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SlimewispComponentData {}

export interface SlimewispComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.slimewisp, typeof SlimewispComponentArray> {}
}

export const SlimewispComponentArray = registerServerComponentArray(
   ServerComponentType.slimewisp,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SlimewispComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SlimewispComponentArray.onHit = onHit;
SlimewispComponentArray.onDie = onDie;

function decodeData(): SlimewispComponentData {
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
      TextureIndex.entities_slimewisp_slimewisp
   );
   renderPart.opacity = 0.8;
   renderObject.attachRenderPart(renderPart);
}

function createComponent(): SlimewispComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(_entity: Entity, hitbox: Hitbox): void {
   const radius = (hitbox.box as CircularBox).radius;
   
   createSlimePoolParticle(hitbox.box.posX, hitbox.box.posY, radius);

   for (let i = 0; i < 2; i++) {
      createSlimeSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius * Math.random());
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const radius = (hitbox.box as CircularBox).radius;

   createSlimePoolParticle(hitbox.box.posX, hitbox.box.posY, radius);

   for (let i = 0; i < 3; i++) {
      createSlimeSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius * Math.random());
   }
}