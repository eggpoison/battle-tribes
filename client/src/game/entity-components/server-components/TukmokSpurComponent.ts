import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { randFloat } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxTag, Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface TukmokSpurComponentData {}

export interface TukmokSpurComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tukmokSpur, typeof TukmokSpurComponentArray> {}
}

export const TukmokSpurComponentArray = registerServerComponentArray(
   ServerComponentType.tukmokSpur,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
TukmokSpurComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TukmokSpurComponentArray.onHit = onHit;

function decodeData(): TukmokSpurComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const tag = getHitboxTag(hitbox);
   
   let textureIndex: TextureIndex;
   if (tag === HitboxTag.tukmokSpurHead) {
      textureIndex = TextureIndex.entities_tukmokSpur_spurHead;
   } else if (tag === HitboxTag.tukmokSpurShoulderLeftFront) {
      textureIndex = TextureIndex.entities_tukmokSpur_spurShoulderLeftFront;
   } else if (tag === HitboxTag.tukmokSpurShoulderLeftBack) {
      textureIndex = TextureIndex.entities_tukmokSpur_spurShoulderLeftBack;
   } else if (tag === HitboxTag.tukmokSpurShoulderRightFront) {
      textureIndex = TextureIndex.entities_tukmokSpur_spurShoulderRightFront;
   } else {
      textureIndex = TextureIndex.entities_tukmokSpur_spurShoulderRightBack;
   }
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         textureIndex
      )
   );
}

function createComponent(): TukmokSpurComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("tukmok-bone-hit.mp3", 0.4, randFloat(0.92, 1.08), entity, hitbox, false);
}