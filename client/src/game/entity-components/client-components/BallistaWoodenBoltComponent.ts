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
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-registry";

export interface BallistaWoodenBoltComponentData {}

export interface BallistaWoodenBoltComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.ballistaWoodenBolt, _BallistaWoodenBoltComponentArray, BallistaWoodenBoltComponent> {}
}

class _BallistaWoodenBoltComponentArray extends _ClientComponentArray<BallistaWoodenBoltComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("projectiles/wooden-bolt.png")
         )
      );
   }

   public createComponent(): BallistaWoodenBoltComponent {
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

export const BallistaWoodenBoltComponentArray = registerClientComponentArray(ClientComponentType.ballistaWoodenBolt, _BallistaWoodenBoltComponentArray, true);

export function createBallistaWoodenBoltComponentData(): BallistaWoodenBoltComponentData {
   return {};
}