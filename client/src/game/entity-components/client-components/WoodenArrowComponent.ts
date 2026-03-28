import { Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";

export interface WoodenArrowComponentData {}

interface IntermediateInfo {}

export interface WoodenArrowComponent {}

export const WoodenArrowComponentArray = new ClientComponentArray<WoodenArrowComponent, IntermediateInfo>(ClientComponentType.woodenArrow, true, createComponent, getMaxRenderParts);
WoodenArrowComponentArray.populateIntermediateInfo = populateIntermediateInfo;
WoodenArrowComponentArray.onDie = onDie;

export function createWoodenArrowComponentData(): WoodenArrowComponentData {
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
         getTextureArrayIndex("projectiles/wooden-arrow.png")
      )
   );

   return {};
}

function createComponent(): WoodenArrowComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   // Create arrow break particles
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const velocity = getHitboxVelocity(hitbox);
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(hitbox.box.position.x, hitbox.box.position.y, velocity.x, velocity.y);
   }
}