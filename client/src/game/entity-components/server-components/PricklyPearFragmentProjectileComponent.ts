import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { Entity } from "../../../../../shared/src/entities";
import { randAngle, randFloat } from "../../../../../shared/src/utils";
import { createPricklyPearParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface PricklyPearFragmentProjectileComponentData {
   readonly variant: number;
}

interface IntermediateInfo {}

export interface PricklyPearFragmentProjectileComponent {}

export const PricklyPearFragmentProjectileComponentArray = new ServerComponentArray<PricklyPearFragmentProjectileComponent, PricklyPearFragmentProjectileComponentData, IntermediateInfo>(ServerComponentType.pricklyPearFragmentProjectile, true, createComponent, getMaxRenderParts, decodeData);
PricklyPearFragmentProjectileComponentArray.populateIntermediateInfo = populateIntermediateInfo;
PricklyPearFragmentProjectileComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): PricklyPearFragmentProjectileComponentData {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const pricklyPearFragmentProjectileComponentData = entityComponentData.serverComponentData[ServerComponentType.pricklyPearFragmentProjectile]!;

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/prickly-pear-fragment-projectile/fragment-" + (pricklyPearFragmentProjectileComponentData.variant + 1) + ".png")
      )
   );

   return {};
}

function createComponent(): PricklyPearFragmentProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function onDie(fragment: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(fragment);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox("prickly-pear-fragment-projectile-explode.mp3", 0.4, randFloat(0.9, 1.1), fragment, hitbox, false);
   
   for (let i = 0; i < 4; i++) {
      const offsetDirection = randAngle();
      const offsetMagnitude = randFloat(4, 8);
      const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createPricklyPearParticle(x, y, randAngle());
   }
}