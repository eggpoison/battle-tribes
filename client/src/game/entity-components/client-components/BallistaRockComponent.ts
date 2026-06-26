import { Entity } from "../../../../../shared/src/entities";
import { _point } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";
import ClientComponentArray from "../ClientComponentArray";
import { TextureIndex } from "../../../texture-index";

export interface BallistaRockComponentData {}

export interface BallistaRockComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.ballistaRock, typeof BallistaRockComponentArray> {}
}

export const BallistaRockComponentArray = registerClientComponentArray(
   ClientComponentType.ballistaRock,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
BallistaRockComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BallistaRockComponentArray.onDie = onDie;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.projectiles_ballistaRock
      )
   );
}

function createComponent(): BallistaRockComponent {
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

export function createBallistaRockComponentData(): BallistaRockComponentData {
   return {};
}