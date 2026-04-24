import { _point, Entity } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";

export interface WoodenArrowComponentData {}

export interface WoodenArrowComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.woodenArrow, _WoodenArrowComponentArray> {}
}

class _WoodenArrowComponentArray extends _ClientComponentArray<WoodenArrowComponent, WoodenArrowComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("projectiles/wooden-arrow.png")
         )
      );
   }

   public createComponent(): WoodenArrowComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onDie(entity: Entity): void {
      // Create arrow break particles
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      getHitboxVelocity(hitbox);
      const velocity = _point;
      for (let i = 0; i < 6; i++) {
         createArrowDestroyParticle(hitbox.box.position.x, hitbox.box.position.y, velocity.x, velocity.y);
      }
   }
}

export const WoodenArrowComponentArray = registerClientComponentArray(ClientComponentType.woodenArrow, _WoodenArrowComponentArray, true);

export function createWoodenArrowComponentData(): WoodenArrowComponentData {
   return {};
}