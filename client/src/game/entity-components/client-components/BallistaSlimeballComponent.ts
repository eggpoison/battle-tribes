import { Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray, TransformComponentData } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";

export interface BallistaSlimeballComponentData {}

interface IntermediateInfo {}

export interface BallistaSlimeballComponent {}

export const BallistaSlimeballComponentArray = new ClientComponentArray<BallistaSlimeballComponent, IntermediateInfo>(ClientComponentType.ballistaSlimeball, true, createComponent, getMaxRenderParts);
BallistaSlimeballComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BallistaSlimeballComponentArray.onDie = onDie;

export function createBallistaSlimeballComponentData(): BallistaSlimeballComponentData {
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
         getTextureArrayIndex("projectiles/ballista-slimeball.png")
      )
   );

   return {};
}

function createComponent(): BallistaSlimeballComponent {
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