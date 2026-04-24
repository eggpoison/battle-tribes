import { _point, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";
import _ClientComponentArray from "../ClientComponentArray";

export interface BallistaRockComponentData {}

export interface BallistaRockComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.ballistaRock, _BallistaRockComponentArray> {}
}

class _BallistaRockComponentArray extends _ClientComponentArray<BallistaRockComponent, BallistaRockComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("projectiles/ballista-rock.png")
         )
      );
   }

   public createComponent(): BallistaRockComponent {
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

export const BallistaRockComponentArray = registerClientComponentArray(ClientComponentType.ballistaRock, _BallistaRockComponentArray, true);

export function createBallistaRockComponentData(): BallistaRockComponentData {
   return {};
}