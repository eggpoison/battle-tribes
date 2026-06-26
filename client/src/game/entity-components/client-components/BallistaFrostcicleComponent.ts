import { Entity } from "../../../../../shared/src/entities";
import { _point } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { registerClientComponentArray } from "../component-registry";
import { getTransformComponentData } from "../component-types";
import { TextureIndex } from "../../../texture-index";

export interface BallistaFrostcicleComponentData {}

export interface BallistaFrostcicleComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.ballistaFrostcicle, typeof BallistaFrostcicleComponentArray> {}
}

export const BallistaFrostcicleComponentArray = registerClientComponentArray(
   ClientComponentType.ballistaFrostcicle,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
BallistaFrostcicleComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BallistaFrostcicleComponentArray.onDie = onDie;

export function createBallistaFrostcicleComponentData(): BallistaFrostcicleComponentData {
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
         TextureIndex.projectiles_ballistaFrostcicle
      )
   );
}

function createComponent(): BallistaFrostcicleComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   getHitboxVelocity(hitbox);
   const velocity = _point;

   // Create arrow break particles
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(hitbox.box.posX, hitbox.box.posY, velocity.x, velocity.y);
   }

   playSoundOnHitbox("ice-break.mp3", 0.4, 1, entity, hitbox, false);
}