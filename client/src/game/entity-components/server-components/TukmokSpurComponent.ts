import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { randFloat } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxTag, Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TukmokSpurComponentData {}

export interface TukmokSpurComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tukmokSpur, _TukmokSpurComponentArray> {}
}

class _TukmokSpurComponentArray extends _ServerComponentArray<TukmokSpurComponent, TukmokSpurComponentData> {
   public decodeData(): TukmokSpurComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const tag = getHitboxTag(hitbox);
      
      let textureSource: string;
      if (tag === HitboxTag.tukmokSpurHead) {
         textureSource = "entities/tukmok-spur/spur-head.png";
      } else if (tag === HitboxTag.tukmokSpurShoulderLeftFront) {
         textureSource = "entities/tukmok-spur/spur-shoulder-left-front.png";
      } else if (tag === HitboxTag.tukmokSpurShoulderLeftBack) {
         textureSource = "entities/tukmok-spur/spur-shoulder-left-back.png";
      } else if (tag === HitboxTag.tukmokSpurShoulderRightFront) {
         textureSource = "entities/tukmok-spur/spur-shoulder-right-front.png";
      } else {
         textureSource = "entities/tukmok-spur/spur-shoulder-right-back.png";
      }
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex(textureSource)
         )
      );
   }

   public createComponent(): TukmokSpurComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      playSoundOnHitbox("tukmok-bone-hit.mp3", 0.4, randFloat(0.92, 1.08), entity, hitbox, false);
   }
}

export const TukmokSpurComponentArray = registerServerComponentArray(ServerComponentType.tukmokSpur, _TukmokSpurComponentArray, true);