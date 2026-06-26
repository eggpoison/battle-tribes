import { Entity } from "../../../../../shared/src/entities";
import { _point } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface BallistaWoodenBoltComponentData {}

export interface BallistaWoodenBoltComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.ballistaWoodenBolt, typeof BallistaWoodenBoltComponentArray> {}
}

export const BallistaWoodenBoltComponentArray = registerClientComponentArray(
   ClientComponentType.ballistaWoodenBolt,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
BallistaWoodenBoltComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BallistaWoodenBoltComponentArray.onDie = onDie;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.projectiles_woodenBolt
      )
   );
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
   getHitboxVelocity(hitbox);
   const velocity = _point;
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(hitbox.box.posX, hitbox.box.posY, velocity.x, velocity.y);
   }
}

export function createBallistaWoodenBoltComponentData(): BallistaWoodenBoltComponentData {
   return {};
}