import { _point, Entity } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { transformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";

export interface BallistaSlimeballComponentData {}

export interface BallistaSlimeballComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.ballistaSlimeball, _BallistaSlimeballComponentArray> {}
}

class _BallistaSlimeballComponentArray extends _ClientComponentArray<BallistaSlimeballComponent, BallistaSlimeballComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("projectiles/ballista-slimeball.png")
         )
      );
   }

   public createComponent(): BallistaSlimeballComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onDie(entity: Entity): void {
      // Create arrow break particles
      const transformComponent = transformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      getHitboxVelocity(hitbox);
      const velocity = _point;
      for (let i = 0; i < 6; i++) {
         createArrowDestroyParticle(hitbox.box.posX, hitbox.box.posY, velocity.x, velocity.y);
      }
   }
}

export const BallistaSlimeballComponentArray = registerClientComponentArray(ClientComponentType.ballistaSlimeball, _BallistaSlimeballComponentArray, true);

export function createBallistaSlimeballComponentData(): BallistaSlimeballComponentData {
   return {};
}