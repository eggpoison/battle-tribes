import { _point, Entity } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-register";

export interface BallistaFrostcicleComponentData {}

export interface BallistaFrostcicleComponent {}

class _BallistaFrostcicleComponentArray extends ClientComponentArray<BallistaFrostcicleComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("projectiles/ballista-frostcicle.png")
         )
      );
   }

   public createComponent(): BallistaFrostcicleComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      getHitboxVelocity(hitbox);
      const velocity = _point;

      // Create arrow break particles
      for (let i = 0; i < 6; i++) {
         createArrowDestroyParticle(hitbox.box.position.x, hitbox.box.position.y, velocity.x, velocity.y);
      }

      playSoundOnHitbox("ice-break.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const BallistaFrostcicleComponentArray = registerClientComponentArray(ClientComponentType.ballistaFrostcicle, _BallistaFrostcicleComponentArray, true);

export function createBallistaFrostcicleComponentData(): BallistaFrostcicleComponentData {
   return {};
}