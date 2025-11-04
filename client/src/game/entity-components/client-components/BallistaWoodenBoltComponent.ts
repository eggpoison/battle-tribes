import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface BallistaWoodenBoltComponentData {}

interface IntermediateInfo {}

export interface BallistaWoodenBoltComponent {}

export const BallistaWoodenBoltComponentArray = new ClientComponentArray<BallistaWoodenBoltComponent, IntermediateInfo>(ClientComponentType.ballistaWoodenBolt, true, createComponent, getMaxRenderParts);
BallistaWoodenBoltComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BallistaWoodenBoltComponentArray.onDie = onDie;

export function createBallistaWoodenBoltComponentData(): BallistaWoodenBoltComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("projectiles/wooden-bolt.png")
      )
   );

   return {};
}

function createComponent(): BallistaWoodenBoltComponent {
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