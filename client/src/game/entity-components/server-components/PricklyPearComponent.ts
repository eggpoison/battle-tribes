import { randAngle, randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { createPricklyPearParticle } from "../../particles";
import { HealthComponentArray } from "./HealthComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface PricklyPearComponentData {}

export interface PricklyPearComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.pricklyPear, _PricklyPearComponentArray> {}
}

class _PricklyPearComponentArray extends _ServerComponentArray<PricklyPearComponent, PricklyPearComponentData> {
   public decodeData(): PricklyPearComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/prickly-pear/prickly-pear.png")
         )
      );
   }

   public createComponent(): PricklyPearComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
      
   public onDie(pricklyPear: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(pricklyPear);
      const hitbox = transformComponent.hitboxes[0];

      const healthComponent = HealthComponentArray.getComponent(pricklyPear);
      if (healthComponent.health <= 0) {
         playSoundOnHitbox("prickly-pear-explode.mp3", 0.65, randFloat(0.9, 1.1), pricklyPear, hitbox, false);

         for (let i = 0; i < 7; i++) {
            const offsetDirection = randAngle();
            const offsetMagnitude = randFloat(4, 8);
            const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
            const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
            createPricklyPearParticle(x, y, randAngle());
         }
      } else {
         playSoundOnHitbox("prickly-pear-snap.mp3", 0.5, randFloat(0.9, 1.1), pricklyPear, hitbox, false);
      }
   }
}

export const PricklyPearComponentArray = registerServerComponentArray(ServerComponentType.pricklyPear, _PricklyPearComponentArray, true);