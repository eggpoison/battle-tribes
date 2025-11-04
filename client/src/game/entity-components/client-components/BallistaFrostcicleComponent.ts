import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface BallistaFrostcicleComponentData {}

interface IntermediateInfo {}

export interface BallistaFrostcicleComponent {}

export const BallistaFrostcicleComponentArray = new ClientComponentArray<BallistaFrostcicleComponent, IntermediateInfo>(ClientComponentType.ballistaFrostcicle, true, createComponent, getMaxRenderParts);
BallistaFrostcicleComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BallistaFrostcicleComponentArray.onDie = onDie;

export function createBallistaFrostcicleComponentData(): BallistaFrostcicleComponentData {
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
         getTextureArrayIndex("projectiles/ballista-frostcicle.png")
      )
   );

   return {};
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
   const velocity = getHitboxVelocity(hitbox);

   // Create arrow break particles
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(hitbox.box.position.x, hitbox.box.position.y, velocity.x, velocity.y);
   }

   playSoundOnHitbox("ice-break.mp3", 0.4, 1, entity, hitbox, false);
}